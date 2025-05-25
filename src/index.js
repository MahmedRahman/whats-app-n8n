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
const WhatsAppEvents = require('./whatsappEvents');







// just open router 
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Initialize WhatsApp client




// get qr code from client and emit it to all connected clients
//handle ready event
//handle disconnected event
//handle message event
//handle authentication check
//handle message event
//handle message event
//handle message event




const routes = require('./routes');

// Set up dependencies for routes that need them
const routeDependencies = {

};

// Initialize all routes
routes.initRoutes(app, routeDependencies);

// Start the server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`WhatsApp to n8n Integration Service is running on port ${PORT}`);
  console.log(`Web Interface: http://localhost:${PORT}`);
  console.log(`Make sure to configure this URL in the WhatsApp Business API settings`);
});





// // Initialize Express app and HTTP server
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST']
//   },
//   transports: ['websocket', 'polling']
// });

// // Middleware
// app.use(express.json());

// // Serve static files from the public directory
// app.use(express.static(path.join(__dirname, '..', 'public'),));

// // Initialize settings API
// const settingsApi = new SettingsApi();

// // Create a fixed session directory to persist authentication
// const sessionDir = path.join(__dirname, '..', '.wwebjs_auth', 'persistent-session');

// // Ensure the session directory exists
// const fs = require('fs');
// if (!fs.existsSync(sessionDir)) {
//   fs.mkdirSync(sessionDir, { recursive: true });
//   console.log('Created persistent session directory:', sessionDir);
// }

// // Initialize WhatsApp Web client with persistent authentication
// const client = new Client({
//   authStrategy: new LocalAuth({
//     clientId: 'whats-app-n8n-persistent',
//     dataPath: sessionDir
//   }),
//   puppeteer: {
//     headless: true,
//     executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
//     args: [
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--disable-dev-shm-usage',
//       '--disable-accelerated-2d-canvas',
//       '--no-first-run',
//       '--no-zygote',
//       '--disable-gpu',
//       '--disable-extensions',
//       '--disable-application-cache',
//       '--user-data-dir=' + sessionDir,
//       '--disable-features=site-per-process', // Disable site isolation
//       '--disable-web-security', // Disable web security for same origin policy
//       '--allow-running-insecure-content' // Allow running insecure content
//     ],
//     // Add timeout options to make puppeteer more robust
//     defaultViewport: null,
//     timeout: 120000, // 120 seconds timeout for operations
//     ignoreHTTPSErrors: true, // Ignore HTTPS errors
//     handleSIGINT: false, // Don't close the browser on SIGINT
//     handleSIGTERM: false, // Don't close the browser on SIGTERM
//     handleSIGHUP: false, // Don't close the browser on SIGHUP
//   },
//   // Add client options to make it more robust
//   restartOnAuthFail: true,
//   qrMaxRetries: 5,
//   qrTimeoutMs: 60000, // 60 seconds timeout for QR code scanning
//   takeoverOnConflict: true,
//   takeoverTimeoutMs: 30000, // 30 seconds timeout for takeover
//   userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36', // Use a stable user agent
// });

// // Initialize WhatsApp Cloud API
// const whatsappApi = new WhatsAppCloudAPI();

// // Initialize n8n webhook
// const n8nWebhook = new N8nWebhook(settingsApi);


// // Initialize routes




