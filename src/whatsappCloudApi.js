const axios = require('axios');
require('dotenv').config();

class WhatsAppCloudAPI {
  constructor() {
    this.apiUrl = 'https://graph.facebook.com/v17.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.token = process.env.WHATSAPP_API_TOKEN;
  }

  /**
   * Send a text message to a WhatsApp user
   * @param {string} to - Recipient's phone number (with country code)
   * @param {string} text - Message text
   * @returns {Promise} - API response
   */
  async sendTextMessage(to, text) {
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.apiUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            body: text
          }
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Process incoming webhook data from WhatsApp Cloud API
   * @param {Object} webhookData - Webhook payload from WhatsApp
   * @returns {Array} - Array of extracted messages
   */
  processWebhook(webhookData) {
    const messages = [];
    
    try {
      if (webhookData.object === 'whatsapp_business_account') {
        const entries = webhookData.entry || [];
        
        for (const entry of entries) {
          const changes = entry.changes || [];
          
          for (const change of changes) {
            const value = change.value;
            
            if (value.messages && value.messages.length > 0) {
              for (const msg of value.messages) {
                const messageData = {
                  messageId: msg.id,
                  from: msg.from,
                  timestamp: msg.timestamp,
                  type: msg.type,
                  body: ''
                };
                
                // Extract message content based on type
                if (msg.type === 'text' && msg.text) {
                  messageData.body = msg.text.body;
                } else if (msg.type === 'image' && msg.image) {
                  messageData.body = '[Image]';
                  messageData.mediaId = msg.image.id;
                  messageData.mediaUrl = msg.image.url;
                } else if (msg.type === 'document' && msg.document) {
                  messageData.body = '[Document]';
                  messageData.mediaId = msg.document.id;
                  messageData.mediaUrl = msg.document.url;
                } else if (msg.type === 'audio' && msg.audio) {
                  messageData.body = '[Audio]';
                  messageData.mediaId = msg.audio.id;
                } else if (msg.type === 'video' && msg.video) {
                  messageData.body = '[Video]';
                  messageData.mediaId = msg.video.id;
                  messageData.mediaUrl = msg.video.url;
                } else if (msg.type === 'location' && msg.location) {
                  messageData.body = '[Location]';
                  messageData.location = msg.location;
                }
                
                messages.push(messageData);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing webhook data:', error);
    }
    
    return messages;
  }

  /**
   * Verify webhook challenge from WhatsApp Cloud API
   * @param {Object} query - Request query parameters
   * @returns {Object} - Verification result
   */
  verifyWebhook(query) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      return {
        success: true,
        challenge: challenge
      };
    }
    
    return {
      success: false
    };
  }
}

module.exports = WhatsAppCloudAPI;
