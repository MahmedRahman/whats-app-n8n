const fs = require('fs');
const path = require('path');

class SettingsApi {
  constructor() {
    this.settingsPath = path.join(__dirname, '..', 'settings.json');
    this.settings = this.loadSettings();
  }

  /**
   * Load settings from the settings file
   * @returns {Object} - Settings object
   */
  loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        console.log('Loading settings from file:', this.settingsPath);
        const settings = JSON.parse(data);
        console.log('Loaded settings:', JSON.stringify(settings, null, 2));
        return settings;
      }
      console.log('Settings file does not exist, using defaults');
      return {
        // General settings
        n8nWebhookUrl: '',
        verifyToken: process.env.VERIFY_TOKEN || '',
        whatsappApiToken: process.env.WHATSAPP_API_TOKEN || '',
        whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        
        // Service status
        serviceEnabled: process.env.SERVICE_ENABLED !== 'false',
        
        // Blacklist
        blacklist: process.env.BLACKLIST ? process.env.BLACKLIST.split(',') : [],
        
        // System messages
        welcomeMessage: process.env.WELCOME_MESSAGE || 'Thank you for your message. We will get back to you soon.',
        unavailableMessage: process.env.UNAVAILABLE_MESSAGE || 'Sorry, the service is currently unavailable.',
        blacklistMessage: process.env.BLACKLIST_MESSAGE || ''
      };
    } catch (error) {
      console.error('Error loading settings:', error);
      return {
        // General settings
        n8nWebhookUrl: '',
        verifyToken: process.env.VERIFY_TOKEN || '',
        whatsappApiToken: process.env.WHATSAPP_API_TOKEN || '',
        whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        
        // Service status
        serviceEnabled: process.env.SERVICE_ENABLED !== 'false',
        
        // Blacklist
        blacklist: process.env.BLACKLIST ? process.env.BLACKLIST.split(',') : [],
        
        // System messages
        welcomeMessage: process.env.WELCOME_MESSAGE || 'Thank you for your message. We will get back to you soon.',
        unavailableMessage: process.env.UNAVAILABLE_MESSAGE || 'Sorry, the service is currently unavailable.',
        blacklistMessage: process.env.BLACKLIST_MESSAGE || ''
      };
    }
  }

  /**
   * Save settings to the settings file
   * @param {Object} settings - Settings object to save
   * @returns {Object} - Result of the save operation
   */
  saveSettings(settings) {
    try {
      console.log('Saving settings:', JSON.stringify(settings, null, 2));
      console.log('Webhook URL being saved:', settings.n8nWebhookUrl);
      
      // Update environment variables in memory
      // General settings
      process.env.VERIFY_TOKEN = settings.verifyToken;
      process.env.WHATSAPP_API_TOKEN = settings.whatsappApiToken;
      process.env.WHATSAPP_PHONE_NUMBER_ID = settings.whatsappPhoneNumberId;
      
      // Service status
      process.env.SERVICE_ENABLED = settings.serviceEnabled ? 'true' : 'false';
      
      // Blacklist
      process.env.BLACKLIST_ENABLED = settings.blacklistEnabled ? 'true' : 'false';
      process.env.BLACKLIST = settings.blacklist ? settings.blacklist.join(',') : '';
      
      // System messages
      process.env.WELCOME_MESSAGE = settings.welcomeMessage || '';
      process.env.UNAVAILABLE_MESSAGE = settings.unavailableMessage || '';
      process.env.BLACKLIST_MESSAGE = settings.blacklistMessage || '';
      
      // Save to file
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
      
      // Update our local copy
      this.settings = settings;
      
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current settings
   * @returns {Object} - Current settings
   */
  getSettings() {
    return this.settings;
  }
  
  /**
   * Check if a phone number is blacklisted
   * @param {string} phoneNumber - Phone number to check
   * @returns {boolean} - True if blacklisted, false otherwise
   */
  isBlacklisted(phoneNumber) {
    // If blacklist is disabled, return false regardless of the number
    if (!this.isBlacklistEnabled()) {
      return false;
    }
    
    if (!this.settings.blacklist || !Array.isArray(this.settings.blacklist)) {
      return false;
    }
    
    return this.settings.blacklist.includes(phoneNumber);
  }
  
  /**
   * Check if the blacklist feature is enabled
   * @returns {boolean} - True if blacklist is enabled, false otherwise
   */
  isBlacklistEnabled() {
    return this.settings.blacklistEnabled !== false;
  }
  
  /**
   * Check if the service is enabled
   * @returns {boolean} - True if enabled, false otherwise
   */
  isServiceEnabled() {
    return this.settings.serviceEnabled !== false;
  }
}

module.exports = SettingsApi;
