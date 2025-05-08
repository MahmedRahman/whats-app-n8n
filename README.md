# WhatsApp to n8n Integration

This application integrates WhatsApp with n8n workflows by:
1. Receiving messages from WhatsApp
2. Forwarding these messages to an n8n webhook
3. Optionally sending responses back to WhatsApp based on n8n's output

## Features

- WhatsApp message listening via WhatsApp Web API
- Webhook endpoint for WhatsApp Cloud API integration
- Automatic forwarding of messages to n8n webhooks
- Reply functionality based on n8n webhook response

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- An n8n instance with a webhook node configured
- WhatsApp account

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables by editing the `.env` file:
   ```
   # WhatsApp API Configuration
   WHATSAPP_API_TOKEN=your_whatsapp_api_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   VERIFY_TOKEN=your_webhook_verify_token

   # n8n Webhook Configuration
   N8N_WEBHOOK_URL=http://your-n8n-instance/webhook/whatsapp
   ```

### Running the Application

Start the application:
```
npm start
```

For development with auto-restart:
```
npm run dev
```

### WhatsApp Web Authentication

When using the WhatsApp Web API (whatsapp-web.js), you'll need to authenticate by scanning a QR code:

1. Start the application
2. A QR code will be displayed in the terminal
3. Open WhatsApp on your phone
4. Go to Settings > Linked Devices > Link a Device
5. Scan the QR code displayed in the terminal

### Setting up n8n

1. In your n8n instance, create a new workflow
2. Add a Webhook node as a trigger
3. Configure it as a "Webhook" type (not "Test webhook")
4. Copy the generated webhook URL
5. Paste this URL in your `.env` file as `N8N_WEBHOOK_URL`

## Usage

### WhatsApp Web API

Once authenticated, the application will automatically:
1. Listen for incoming WhatsApp messages
2. Forward them to your n8n webhook
3. Send any replies from n8n back to the sender

### WhatsApp Cloud API

To use the official WhatsApp Business API:

1. Set up a WhatsApp Business account
2. Configure the webhook URL in the Meta Developer Portal to point to your `/webhook` endpoint
3. Set the same verification token in both the Meta Developer Portal and your `.env` file
4. The application will handle webhook verification and message processing

## Data Format

Data sent to n8n webhook:
```json
{
  "messageId": "message-id",
  "from": "sender-phone-number",
  "body": "message-content",
  "timestamp": 1234567890,
  "type": "message-type"
}
```

Expected response from n8n (optional):
```json
{
  "reply": "Response message to send back to WhatsApp"
}
```

## License

ISC
