# WhatsApp to n8n Integration

[![Docker Image](https://img.shields.io/docker/pulls/digitalhubegyptcom/whatsapp-n8n.svg)](https://hub.docker.com/r/digitalhubegyptcom/whatsapp-n8n)

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

### Option 1: Quick Setup with Docker (Recommended)

The easiest way to get started is using our pre-built Docker image:

```bash
# Create a directory for your deployment
mkdir whatsapp-n8n && cd whatsapp-n8n

# Create a docker-compose.yml file
cat > docker-compose.yml << 'EOL'
services:
  whatsapp-n8n:
    image: digitalhubegyptcom/whatsapp-n8n:latest-amd64
    container_name: whatsapp-n8n
    restart: unless-stopped
    ports:
      - "3002:3002"
    volumes:
      - ./data:/usr/src/app/.wwebjs_auth
      - ./.env.docker:/usr/src/app/.env
    environment:
      - NODE_ENV=production
      - TZ=UTC
      - PORT=3002
      - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
      - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
      # Puppeteer/Chromium flags to fix container issues
      - PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-accelerated-2d-canvas,--no-first-run,--no-zygote,--single-process,--disable-gpu
    shm_size: '1gb'
    # Add tmpfs mount to avoid file lock issues
    tmpfs:
      - /tmp
EOL

# Create .env.docker file
cat > .env.docker << 'EOL'
# WhatsApp API Configuration
WHATSAPP_API_TOKEN=your_whatsapp_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# n8n Webhook Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/your-webhook-id

# Port configuration
PORT=3002
EOL

# Create data directory for persistent storage
mkdir -p data

# Start the container
docker-compose up -d
```

Then access the application at: http://localhost:3002

### Option 2: Manual Setup

#### Prerequisites

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

#### Local Development

Start the application:
```
npm start
```

For development with auto-restart:
```
npm run dev
```

#### Docker Deployment

You can also run the application using Docker:

1. Build and start the container:
   ```
   docker-compose up -d
   ```

2. View logs:
   ```
   docker-compose logs -f
   ```

3. Stop the container:
   ```
   docker-compose down
   ```

4. Access the application:
   ```
   http://localhost:3002
   ```

The Docker setup includes:
- Persistent storage for WhatsApp session data
- Proper environment for running Puppeteer/Chromium
- Automatic restart on failure

##### Troubleshooting Docker

- **Port conflicts**: If port 3001 is already in use, modify the port mapping in `docker-compose.yml`:
  ```yaml
  ports:
    - "3002:3000"  # Change 3002 to any available port
  ```

- **QR Code scanning**: Access the web interface at http://localhost:3002 to scan the QR code with your WhatsApp mobile app

- **Container not starting**: Check logs with `docker-compose logs -f` to identify issues

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
