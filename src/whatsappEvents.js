const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');

/**
 * WhatsApp client event handler
 * Manages all WhatsApp client events and their interactions with the system
 */
class WhatsAppEvents {
    constructor(client, io, settingsApi, n8nWebhook, sessionDir) {
        this.client = client;
        this.io = io;
        this.settingsApi = settingsApi;
        this.n8nWebhook = n8nWebhook;
        this.sessionDir = sessionDir;

        // State variables
        this.lastQrCode = null;
        this.qrAttempts = 0;
        this.MAX_QR_ATTEMPTS = 3;
        this.clientInitialized = false;

        // Bind methods to ensure 'this' context
        this.setupEventListeners = this.setupEventListeners.bind(this);
        this.handleQrCode = this.handleQrCode.bind(this);
        this.handleReady = this.handleReady.bind(this);
        this.handleDisconnected = this.handleDisconnected.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.isClientAuthenticated = this.isClientAuthenticated.bind(this);
        this.resetSession = this.resetSession.bind(this);
        this.safelyInitializeClient = this.safelyInitializeClient.bind(this);
        this.checkPreviousAuth = this.checkPreviousAuth.bind(this);
        this.startAuthenticationCheck = this.startAuthenticationCheck.bind(this);
        this.setupSocketHandlers = this.setupSocketHandlers.bind(this);
    }

    /**
     * Set up all WhatsApp client event listeners
     */
    setupEventListeners() {
        // QR code event
        this.client.on('qr', this.handleQrCode);

        // Ready event
        this.client.on('ready', this.handleReady);

        // Disconnected event
        this.client.on('disconnected', this.handleDisconnected);

        // Message event
        this.client.on('message', this.handleMessage);

        console.log('WhatsApp client event listeners have been set up');
    }

    /**
     * Handle QR code generation event
     * @param {string} qr - QR code data
     */
    async handleQrCode(qr) {
        try {
            this.qrAttempts++;
            console.log(`QR RECEIVED (attempt ${this.qrAttempts}/${this.MAX_QR_ATTEMPTS}), scan with WhatsApp mobile app`);

            // Generate QR code with high quality settings
            const qrDataUrl = await qrcode.toDataURL(qr, {
                margin: 1,
                scale: 10,
                errorCorrectionLevel: 'H',
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });

            // Store the QR code for new connections
            this.lastQrCode = qrDataUrl;

            // Emit QR code to all connected clients
            this.io.emit('qr', qrDataUrl);
            console.log('QR code emitted to all clients');

            // If we've exceeded the maximum number of QR code attempts, reset the session
            if (this.qrAttempts >= this.MAX_QR_ATTEMPTS) {
                console.log('Maximum QR code attempts reached, resetting session...');
                setTimeout(() => {
                    if (!this.isClientAuthenticated()) {
                        console.log('Client still not authenticated after max QR attempts, resetting session');
                        this.resetSession();
                        this.qrAttempts = 0; // Reset the counter
                        this.io.emit('auth_failed', { message: 'QR code expired. Please refresh the page to get a new QR code.' });
                    }
                }, 30000); // Wait 30 seconds before resetting
            }
        } catch (err) {
            console.error('Error generating QR code:', err);
        }
    }

    /**
     * Handle client ready event
     */
    handleReady() {
        console.log('WhatsApp Web client is ready!');

        // Clear any existing QR code since we're now authenticated
        this.lastQrCode = null;

        // Reset QR attempts counter
        this.qrAttempts = 0;

        // Save a flag indicating successful authentication
        try {
            fs.writeFileSync(path.join(this.sessionDir, 'auth_success.flag'), 'true');
            console.log('Authentication success flag saved on ready event');
        } catch (err) {
            console.error('Error saving authentication success flag on ready event:', err);
        }

        // Emit ready event to all connected clients with redirect flag
        this.io.emit('ready', { redirect: true });

        // Log success message with instructions
        console.log('WhatsApp authentication successful! You can now use the application.');
        console.log('The webhook URL can be configured in the settings page.');
    }

    /**
     * Handle client disconnected event
     */
    handleDisconnected() {
        console.log('WhatsApp Web client disconnected!');

        // Reset initialization state so we can reinitialize if needed
        this.clientInitialized = false;
        this.lastQrCode = null;

        // Remove the authentication success flag since we're disconnected
        try {
            const authFlagPath = path.join(this.sessionDir, 'auth_success.flag');
            if (fs.existsSync(authFlagPath)) {
                fs.unlinkSync(authFlagPath);
                console.log('Removed authentication flag due to disconnection');
            }
        } catch (err) {
            console.error('Error removing authentication flag:', err);
        }

        // Emit disconnected event to all connected clients
        this.io.emit('disconnected');
    }

    /**
     * Handle incoming messages
     * @param {object} message - Message object from WhatsApp
     */
    async handleMessage(message) {
        console.log(`New message received via WhatsApp Web: ${message.body}`);

        try {
            // Check if service is enabled
            if (!this.settingsApi.isServiceEnabled()) {
                console.log('Service is disabled, not processing message');
                // No reply at all when service is disabled
                return;
            }

            // Check if sender is blacklisted
            if (this.settingsApi.isBlacklisted(message.from)) {
                console.log(`Message from blacklisted number ${message.from} ignored`);

                // Send blacklist message if configured
                const blacklistMessage = this.settingsApi.getSettings().blacklistMessage;
                if (blacklistMessage) {
                    await message.reply(blacklistMessage);
                }
                return;
            }

            // Prepare the data to send to n8n webhook
            const webhookData = {
                messageId: message.id._serialized,
                from: message.from,
                to: message.to,
                body: message.body,
                timestamp: message.timestamp,
                type: message.type,
            };

            // Call n8n webhook
            console.log('Attempting to call n8n webhook...');
            const response = await this.n8nWebhook.trigger(webhookData);
            console.log('n8n webhook response:', response);

            // Send a reply back to the sender if provided by n8n
            if (response && response.reply) {
                console.log('Sending reply from n8n:', response.reply);
                await message.reply(response.reply);
            } else {
                console.log('No reply provided by n8n or webhook not configured');
            }
        } catch (error) {
            console.error('Error handling WhatsApp Web message:', error.message);
        }
    }

    /**
     * Check if the client is authenticated
     * @returns {boolean} - True if authenticated, false otherwise
     */
    isClientAuthenticated() {
        return this.client && this.client.pupBrowser && this.client.pupPage && this.client.info;
    }

    /**
     * Reset the WhatsApp session
     * @returns {Promise<void>}
     */
    async resetSession() {
        console.log('Resetting WhatsApp session...');

        try {
            // Reset state variables
            this.lastQrCode = null;
            this.qrAttempts = 0;
            this.clientInitialized = false;

            // Try to destroy the client if it exists
            if (this.client) {
                try {
                    await this.client.destroy().catch(err => {
                        console.log('Error destroying client during reset, continuing:', err.message);
                    });
                    console.log('WhatsApp client destroyed');
                } catch (destroyErr) {
                    console.error('Error destroying client during reset, continuing:', destroyErr);
                }
            }

            // Remove the authentication flag
            try {
                const authFlagPath = path.join(this.sessionDir, 'auth_success.flag');
                if (fs.existsSync(authFlagPath)) {
                    fs.unlinkSync(authFlagPath);
                    console.log('Removed authentication flag during reset');
                }
            } catch (flagErr) {
                console.error('Error removing authentication flag during reset:', flagErr);
            }

            console.log('WhatsApp session reset complete');
        } catch (error) {
            console.error('Error during session reset:', error);
            throw error;
        }
    }

    /**
     * Safely initialize the WhatsApp client
     * @returns {Promise<void>}
     */
    async safelyInitializeClient() {
        if (this.clientInitialized) {
            console.log('Client already initialized, skipping initialization');
            return;
        }

        console.log('Safely initializing WhatsApp client...');
        this.clientInitialized = true;

        try {
            // Initialize the client
            await this.client.initialize();
            console.log('WhatsApp client initialized successfully');
        } catch (error) {
            console.error('Error initializing WhatsApp client:', error);
            this.clientInitialized = false;
            throw error;
        }
    }

    /**
     * Check if there's a previous successful authentication
     * @returns {boolean} - True if previous auth exists, false otherwise
     */
    checkPreviousAuth() {
        try {
            const authFlagPath = path.join(this.sessionDir, 'auth_success.flag');
            return fs.existsSync(authFlagPath);
        } catch (error) {
            console.error('Error checking for previous authentication:', error);
            return false;
        }
    }

    /**
     * Start authentication check timer
     */
    startAuthenticationCheck() {
        // Check every 5 seconds if the client has authenticated
        const checkInterval = setInterval(() => {
            if (this.isClientAuthenticated()) {
                console.log('Client authenticated, clearing check interval');
                clearInterval(checkInterval);
            }
        }, 5000);

        // Stop checking after 2 minutes (24 checks)
        setTimeout(() => {
            clearInterval(checkInterval);
            console.log('Authentication check timer stopped after timeout');
        }, 120000);
    }

    /**
     * Set up socket.io connection handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('New client connected');

            // If WhatsApp is already connected, emit ready event
            if (this.isClientAuthenticated()) {
                console.log('Client already authenticated, sending ready event');
                socket.emit('ready', { redirect: true });
            } else if (this.lastQrCode) {
                // If we have a QR code already, send it to the new client
                console.log('Sending existing QR code to new client');
                socket.emit('qr', this.lastQrCode);

                // Start authentication check timer
                this.startAuthenticationCheck();
            } else {
                console.log('No QR code available yet, checking client state...');

                // Check if we have a previous successful authentication
                const hasPreviousAuth = this.checkPreviousAuth();

                if (hasPreviousAuth && !this.clientInitialized) {
                    console.log('Found previous authentication, attempting to reuse it');
                    this.safelyInitializeClient().catch(async err => {
                        console.error('Error initializing client with previous auth:', err);
                        // If reusing previous auth fails, delete the auth flag and prepare for new QR code
                        try {
                            const authFlagPath = path.join(this.sessionDir, 'auth_success.flag');
                            if (fs.existsSync(authFlagPath)) {
                                fs.unlinkSync(authFlagPath);
                                console.log('Removed invalid authentication flag');
                            }
                        } catch (flagErr) {
                            console.error('Error removing auth flag:', flagErr);
                        }

                        // Reset session and redirect to login page
                        await this.resetSession();

                        // Emit event to client to redirect to login page
                        socket.emit('auth_redirect', {
                            message: 'Previous authentication expired. Redirecting to login page...',
                            redirect: '/'
                        });
                    });
                } else if (!this.clientInitialized) {
                    console.log('No previous authentication or initialization in progress, starting new authentication');
                    this.safelyInitializeClient().catch(async err => {
                        console.error('Error initializing client during connection:', err);

                        // Reset session and redirect to login page
                        await this.resetSession();

                        // Emit event to client to redirect to login page
                        socket.emit('auth_redirect', {
                            message: 'Authentication failed. Redirecting to login page...',
                            redirect: '/'
                        });
                    });

                    // Start authentication check timer
                    this.startAuthenticationCheck();
                } else {
                    console.log('Client initialization already in progress, waiting for QR code or authentication');

                    // Start authentication check timer
                    this.startAuthenticationCheck();
                }
            }

            // Handle manual QR code requests
            socket.on('requestQR', () => {
                console.log('Manual QR code request received');
                if (this.lastQrCode) {
                    socket.emit('qr', this.lastQrCode);
                } else {
                    // Try to reinitialize the client safely
                    console.log('No QR code available, attempting to reinitialize WhatsApp client');
                    // Reset initialization state if the client was previously initialized but failed
                    if (this.clientInitialized && !this.client.pupBrowser) {
                        console.log('Client was marked as initialized but browser is not available, resetting state');
                        this.clientInitialized = false;
                    }

                    this.safelyInitializeClient().catch(err => {
                        console.error('Error reinitializing WhatsApp client:', err);
                    });
                }
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
        });
    }

    /**
     * Initialize the WhatsApp client
     */
    initialize() {
        console.log('Initializing WhatsApp client and setting up event handlers');
        this.setupEventListeners();
        this.setupSocketHandlers();

        // Initialize the client
        this.safelyInitializeClient().catch(err => {
            console.error('Error during initial client initialization:', err);
        });
    }

    /**
     * Get the current state of the WhatsApp client
     * @returns {Object} - Current state object
     */
    getState() {
        return {
            clientInitialized: this.clientInitialized,
            lastQrCode: this.lastQrCode,
            isAuthenticated: this.isClientAuthenticated()
        };
    }
}

module.exports = WhatsAppEvents;
