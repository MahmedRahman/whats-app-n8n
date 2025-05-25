const express = require('express');
const router = express.Router();

// This file will need access to these variables/functions from the main app
// They will be passed in when the router is initialized
let whatsappApi, n8nWebhook;

// Initialize the router with required dependencies
function init(dependencies) {
    whatsappApi = dependencies.whatsappApi;
    n8nWebhook = dependencies.n8nWebhook;

    return router;
}

// Webhook verification endpoint for WhatsApp Cloud API
router.get('/webhook', (req, res) => {
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
router.post('/webhook', async (req, res) => {
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

module.exports = { router, init };
