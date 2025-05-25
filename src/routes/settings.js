const express = require('express');
const router = express.Router();
const SettingsApi = require('../settingsApi');

// Initialize settings API
const settingsApi = new SettingsApi();

// Settings API routes
router.get('/api/settings', (req, res) => {
    res.json(settingsApi.getSettings());
});

router.post('/api/settings', (req, res) => {
    // Save the settings
    const result = settingsApi.saveSettings(req.body);

    // No need to reinitialize the WhatsApp client when settings change
    // The webhook URL change will be picked up on the next message
    console.log('Settings updated, webhook URL changes will be applied to next messages');

    res.json(result);
});

// Unified settings API endpoint
router.get('/api/unified-settings', (req, res) => {
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

router.post('/api/unified-settings', (req, res) => {
    try {
        // Save the settings
        const result = settingsApi.saveSettings(req.body);

        // No need to reinitialize the WhatsApp client when settings change
        // The webhook URL change will be picked up on the next message
        console.log('Unified settings updated, webhook URL changes will be applied to next messages');

        res.json(result);
    } catch (error) {
        console.error('Error saving unified settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Blacklist API endpoint
router.get('/api/blacklist', (req, res) => {
    const settings = settingsApi.getSettings();
    const blacklist = settings.blacklist || [];
    const blacklistEnabled = settings.blacklistEnabled !== false;
    res.json({ blacklist, blacklistEnabled });
});

// Toggle blacklist status
router.post('/api/blacklist/toggle', (req, res) => {
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
router.get('/api/system-messages', (req, res) => {
    const settings = settingsApi.getSettings();
    const systemMessages = {
        welcomeMessage: settings.welcomeMessage || '',
        unavailableMessage: settings.unavailableMessage || '',
        blacklistMessage: settings.blacklistMessage || '',
        blacklistEnabled: settings.blacklistEnabled !== false
    };
    res.json(systemMessages);
});

module.exports = router;
