const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// This file will need access to these variables/functions from the main app
// They will be passed in when the router is initialized
let client, resetSession, sessionDir, io, clientInitialized, lastQrCode;

// Initialize the router with required dependencies
function init(dependencies) {
    client = dependencies.client;
    resetSession = dependencies.resetSession;
    sessionDir = dependencies.sessionDir;
    io = dependencies.io;
    clientInitialized = dependencies.clientInitialized;
    lastQrCode = dependencies.lastQrCode;

    return router;
}

// Reset session API route
router.post('/api/reset-session', async (req, res) => {
    try {
        console.log('Session reset requested');

        // Reset the session (await the async function)
        await resetSession();

        // Force client to reinitialize on next connection
        clientInitialized = false;

        res.json({ success: true, message: 'WhatsApp session has been reset. Please refresh the page to scan a new QR code.' });
    } catch (error) {
        console.error('Error during session reset:', error);
        res.json({ success: false, error: error.message });
    }
});

// Logout API route
router.post('/api/logout', async (req, res) => {
    try {
        console.log('Logout requested');

        // Reset state variables
        lastQrCode = null;
        clientInitialized = false;

        // Remove the authentication success flag
        try {
            const authFlagPath = path.join(sessionDir, 'auth_success.flag');
            if (fs.existsSync(authFlagPath)) {
                fs.unlinkSync(authFlagPath);
                console.log('Removed authentication flag due to logout');
            }
        } catch (flagErr) {
            console.error('Error removing authentication flag during logout:', flagErr);
        }

        // Attempt to logout from WhatsApp only if the client is in a valid state
        try {
            if (client && client.pupBrowser && client.pupPage) {
                await client.logout().catch(err => {
                    console.log('Error logging out, but continuing with cleanup:', err.message);
                });
                console.log('WhatsApp logout successful');
            } else {
                console.log('Client not in a valid state for logout, skipping logout call');
            }
        } catch (logoutErr) {
            console.error('Error during WhatsApp logout, continuing with cleanup:', logoutErr);
        }

        // Destroy the session safely
        try {
            if (client) {
                await client.destroy().catch(err => {
                    console.log('Error destroying client, but continuing:', err.message);
                });
                console.log('WhatsApp session destroyed');
            }
        } catch (destroyErr) {
            console.error('Error destroying client, but continuing:', destroyErr);
        }

        // Emit disconnected event to all clients
        io.emit('disconnected');

        // Emit redirect event to redirect to login page
        io.emit('auth_redirect', {
            message: 'Logged out successfully. Redirecting to login page...',
            redirect: '/'
        });

        res.json({ success: true, redirect: true });
    } catch (error) {
        console.error('Error during logout:', error);

        // Reset state variables even if there was an error
        lastQrCode = null;
        clientInitialized = false;

        // Remove the authentication flag even if logout failed
        try {
            const authFlagPath = path.join(sessionDir, 'auth_success.flag');
            if (fs.existsSync(authFlagPath)) {
                fs.unlinkSync(authFlagPath);
                console.log('Removed authentication flag after failed logout');
            }
        } catch (flagErr) {
            console.error('Error removing authentication flag after failed logout:', flagErr);
        }

        // Emit redirect event to redirect to login page even if there were errors
        io.emit('auth_redirect', {
            message: 'Logged out successfully. Redirecting to login page...',
            redirect: '/'
        });

        res.json({ success: true, message: 'Session reset successfully despite errors', redirect: true });
    }
});

module.exports = { router, init };
