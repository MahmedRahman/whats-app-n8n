const axios = require('axios');
require('dotenv').config();

class N8nWebhook {
  constructor(settingsApi) {
    this.settingsApi = settingsApi;
  }
  
  /**
   * Get the webhook URL from settings
   * @returns {string} - Webhook URL
   */
  getWebhookUrl() {
    const settings = this.settingsApi ? this.settingsApi.getSettings() : {};
    console.log('Current settings in getWebhookUrl:', JSON.stringify(settings, null, 2));
    console.log('Webhook URL from settings:', settings.n8nWebhookUrl);
    return settings.n8nWebhookUrl || '';
  }

  /**
   * Send data to n8n webhook
   * @param {Object} data - Data to send to n8n
   * @returns {Promise} - Webhook response
   */
  async trigger(data) {
    try {
      const webhookUrl = this.getWebhookUrl();
      
      if (!webhookUrl) {
        console.warn('No n8n webhook URL configured, skipping webhook trigger');
        return { success: false, error: 'No webhook URL configured' };
      }
      
      console.log(`Triggering n8n webhook with data:`, JSON.stringify(data, null, 2));
      
      const response = await axios.post(webhookUrl, data, {
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
