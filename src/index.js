require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const WhatsAppCloudAPI = require('./whatsappCloudApi');
const N8nWebhook = require('./n8nWebhook');

// Initialize Express app
const app = express();
app.use(express.json());

// Initialize WhatsApp Web client (for local development)
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox'],
  }
});

// Initialize WhatsApp Cloud API and n8n webhook handler
const whatsappApi = new WhatsAppCloudAPI();
const n8nWebhook = new N8nWebhook();

// WhatsApp Web client events
client.on('qr', (qr) => {
  // Generate and display QR code in the terminal
  console.log('QR RECEIVED, scan with WhatsApp mobile app:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp Web client is ready!');
});

client.on('message', async (message) => {
  console.log(`New message received via WhatsApp Web: ${message.body}`);
  
  try {
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
    const response = await n8nWebhook.trigger(webhookData);

    // Send a reply back to the sender if provided by n8n
    if (response && response.reply) {
      await message.reply(response.reply);
    }
  } catch (error) {
    console.error('Error handling WhatsApp Web message:', error.message);
  }
});

// Initialize WhatsApp Web client (for local development)
client.initialize();

// API Routes
app.get('/', (req, res) => {
  res.send('WhatsApp to n8n Integration Service');
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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`WhatsApp to n8n Integration Service is running on port ${PORT}`);
  console.log(`Webhook URL: http://your-public-url/webhook`);
  console.log(`Make sure to configure this URL in the WhatsApp Business API settings`);
});
