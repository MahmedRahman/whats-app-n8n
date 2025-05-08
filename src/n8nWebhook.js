const axios = require('axios');
require('dotenv').config();

class N8nWebhook {
  constructor() {
    this.webhookUrl = process.env.N8N_WEBHOOK_URL;
  }

  /**
   * Send data to n8n webhook
   * @param {Object} data - Data to send to n8n
   * @returns {Promise} - Webhook response
   */
  async trigger(data) {
    try {
      console.log(`Triggering n8n webhook with data:`, JSON.stringify(data, null, 2));
      
      const response = await axios.post(this.webhookUrl, data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('n8n webhook response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error triggering n8n webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Format WhatsApp message data for n8n
   * @param {Object} message - WhatsApp message data
   * @returns {Object} - Formatted data for n8n
   */
  formatMessageData(message) {
    return {
      messageId: message.messageId,
      from: message.from,
      body: message.body,
      timestamp: message.timestamp,
      type: message.type,
      // Include any media information if available
      ...(message.mediaId && { mediaId: message.mediaId }),
      ...(message.mediaUrl && { mediaUrl: message.mediaUrl }),
      ...(message.location && { location: message.location }),
    };
  }
}

module.exports = N8nWebhook;
