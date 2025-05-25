const express = require('express');
const path = require('path');
const router = express.Router();

// Main page route
router.get('/', (req, res) => {
    console.log('Main page route accessed');
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'qr.html'));
});

// Settings page route
router.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'settings.html'));
});

module.exports = router;
