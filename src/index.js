require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { EventEmitter } = require('events');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const WhatsAppCloudAPI = require('./whatsappCloudApi');
const N8nWebhook = require('./n8nWebhook');
const SettingsApi = require('./settingsApi');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize settings API
const settingsApi = new SettingsApi();

// Create a unique session directory
const sessionDir = path.join(__dirname, '..', '.wwebjs_auth', 'session-' + Date.now());

// Initialize WhatsApp Web client (for local development)
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'whats-app-n8n-' + Date.now(),
    dataPath: sessionDir
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-application-cache',
      '--user-data-dir=' + sessionDir
    ]
  }
});

// Initialize WhatsApp Cloud API and n8n webhook handler
const whatsappApi = new WhatsAppCloudAPI();
const n8nWebhook = new N8nWebhook(settingsApi);

// Store the last generated QR code
let lastQrCode = null;

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // If WhatsApp is already connected, emit ready event
  if (client.info) {
    socket.emit('ready', { redirect: true });
  } else if (lastQrCode) {
    // If we have a QR code already, send it to the new client
    console.log('Sending existing QR code to new client');
    socket.emit('qr', lastQrCode);
  } else {
    // Initialize WhatsApp client if not already initialized
    console.log('Initializing WhatsApp client...');
    try {
      if (!client.pupBrowser) {
        client.initialize().catch(err => {
          console.error('Error initializing WhatsApp client:', err);
        });
      }
    } catch (error) {
      console.error('Error checking WhatsApp client state:', error);
    }
  }
  
  // Handle manual QR code requests
  socket.on('requestQR', () => {
    console.log('Manual QR code request received');
    if (lastQrCode) {
      socket.emit('qr', lastQrCode);
    } else {
      // Try to reinitialize the client
      console.log('No QR code available, attempting to reinitialize WhatsApp client');
      try {
        client.initialize().catch(err => {
          console.error('Error reinitializing WhatsApp client:', err);
        });
      } catch (error) {
        console.error('Error reinitializing WhatsApp client:', error);
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// WhatsApp client events
client.on('qr', async (qr) => {
  try {
    console.log('QR RECEIVED, scan with WhatsApp mobile app');
    
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
    lastQrCode = qrDataUrl;
    
    // Emit QR code to all connected clients
    io.emit('qr', qrDataUrl);
    console.log('QR code emitted to all clients');
  } catch (err) {
    console.error('Error generating QR code:', err);
  }
});

client.on('ready', () => {
  console.log('WhatsApp Web client is ready!');
  
  // Emit ready event to all connected clients with redirect flag
  io.emit('ready', { redirect: true });
});

client.on('disconnected', () => {
  console.log('WhatsApp Web client disconnected!');
  
  // Emit disconnected event to all connected clients
  io.emit('disconnected');
});

client.on('message', async (message) => {
  console.log(`New message received via WhatsApp Web: ${message.body}`);
  
  try {
    // Check if service is enabled
    if (!settingsApi.isServiceEnabled()) {
      console.log('Service is disabled, not processing message');
      // No reply at all when service is disabled
      return;
    }
    
    // Check if sender is blacklisted
    if (settingsApi.isBlacklisted(message.from)) {
      console.log(`Message from blacklisted number ${message.from} ignored`);
      
      // Send blacklist message if configured
      const blacklistMessage = settingsApi.getSettings().blacklistMessage;
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
    const response = await n8nWebhook.trigger(webhookData);
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
});

// Initialize WhatsApp Web client (for local development)
client.initialize();

// API Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'settings.html'));
});

// Settings API routes
app.get('/api/settings', (req, res) => {
  res.json(settingsApi.getSettings());
});

app.post('/api/settings', (req, res) => {
  const result = settingsApi.saveSettings(req.body);
  res.json(result);
});

// Unified settings API endpoint
app.get('/api/unified-settings', (req, res) => {
  const settings = settingsApi.getSettings();
  const unifiedSettings = {
    // General settings
    n8nWebhookUrl: settings.n8nWebhookUrl || '',
    serviceEnabled: settings.serviceEnabled !== false,
    
    // Blacklist settings
    blacklistEnabled: settings.blacklistEnabled !== false,
    blacklist: settings.blacklist || [],
    
    // System messages
    welcomeMessage: settings.welcomeMessage || '',
    unavailableMessage: settings.unavailableMessage || '',
    blacklistMessage: settings.blacklistMessage || ''
  };
  res.json(unifiedSettings);
});

app.post('/api/unified-settings', (req, res) => {
  try {
    const result = settingsApi.saveSettings(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error saving unified settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Blacklist API endpoint
app.get('/api/blacklist', (req, res) => {
  const settings = settingsApi.getSettings();
  const blacklist = settings.blacklist || [];
  const blacklistEnabled = settings.blacklistEnabled !== false;
  res.json({ blacklist, blacklistEnabled });
});

// Toggle blacklist status
app.post('/api/blacklist/toggle', (req, res) => {
  try {
    const settings = settingsApi.getSettings();
    const newStatus = !settings.blacklistEnabled;
    
    // Update the settings
    settings.blacklistEnabled = newStatus;
    settingsApi.saveSettings(settings);
    
    res.json({ 
      success: true, 
      blacklistEnabled: newStatus,
      message: `Blacklist ${newStatus ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error) {
    console.error('Error toggling blacklist status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// System Messages API endpoint
app.get('/api/system-messages', (req, res) => {
  const settings = settingsApi.getSettings();
  const systemMessages = {
    welcomeMessage: settings.welcomeMessage || '',
    unavailableMessage: settings.unavailableMessage || '',
    blacklistMessage: settings.blacklistMessage || '',
    blacklistEnabled: settings.blacklistEnabled !== false
  };
  res.json(systemMessages);
});

// Logout API route
app.post('/api/logout', async (req, res) => {
  try {
    console.log('Logout requested');
    
    // Attempt to logout from WhatsApp
    await client.logout();
    console.log('WhatsApp logout successful');
    
    // Destroy the session
    client.destroy();
    console.log('WhatsApp session destroyed');
    
    // Emit disconnected event to all clients
    io.emit('disconnected');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error during logout:', error);
    res.json({ success: false, error: error.message });
  }
});

// Webhook verification endpoint for WhatsApp Cloud API
app.get('/webhook', (req, res) => {
  console.log('Received webhook verification request');
  
  const verification = whatsappApi.verifyWebhook(req.query);
  
  if (verification.success) {
    console.log('Webhook verified successfully');
    res.status(200).send(verification.challenge);
  } else {
    console.error('Webhook verification failed');
    res.sendStatus(403);
  }
});

// Webhook for WhatsApp Cloud API (for production use)
app.post('/webhook', async (req, res) => {
  console.log('Received webhook payload from WhatsApp Cloud API');
  
  try {
    // Process the webhook payload
    const messages = whatsappApi.processWebhook(req.body);
    
    if (messages.length > 0) {
      console.log(`Processed ${messages.length} messages from webhook`);
      
      // Process each message
      for (const message of messages) {
        // Format the message for n8n
        const webhookData = n8nWebhook.formatMessageData(message);
        
        // Trigger n8n webhook
        n8nWebhook.trigger(webhookData)
          .then(response => {
            // Send reply if provided by n8n
            if (response && response.reply) {
              whatsappApi.sendTextMessage(message.from, response.reply)
                .then(() => console.log(`Reply sent to ${message.from}`))
                .catch(err => console.error('Error sending reply:', err.message));
            }
          })
          .catch(error => {
            console.error('Error triggering n8n webhook:', error.message);
          });
      }
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Start the server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`WhatsApp to n8n Integration Service is running on port ${PORT}`);
  console.log(`Web Interface: http://localhost:${PORT}`);
  console.log(`Webhook URL: http://your-public-url/webhook`);
  console.log(`Make sure to configure this URL in the WhatsApp Business API settings`);
});
