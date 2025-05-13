#!/bin/bash

# WhatsApp n8n Docker Installation Script
# This script will set up and run the WhatsApp n8n integration in a Docker container
# Using pre-built image from Docker Hub: digitalhubegyptcom/whatsapp-n8n:latest

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
mkdir -p data

# Check if .env.docker exists, create if not
if [ ! -f .env.docker ]; then
    echo "Creating .env.docker file..."
    cat > .env.docker << EOL
# WhatsApp API Configuration
WHATSAPP_API_TOKEN=your_whatsapp_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# n8n Webhook Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/your-webhook-id

# Port configuration
PORT=3002
EOL
    echo ".env.docker file created. Please edit it with your configuration."
    echo "You can do this by running: nano .env.docker"
else
    echo ".env.docker file already exists."
fi

# Start the Docker container
echo "Starting WhatsApp n8n integration..."
docker-compose down
docker-compose up -d

# Check if container is running
if [ "$(docker ps -q -f name=whatsapp-n8n)" ]; then
    echo "WhatsApp n8n integration is now running!"
    echo "You can access the web interface at: http://localhost:3002"
    echo "Scan the QR code with your WhatsApp mobile app to authenticate."
    echo ""
    echo "To view logs, run: docker-compose logs -f"
    echo "To stop the container, run: docker-compose down"
else
    echo "Failed to start the container. Please check the logs: docker-compose logs"
fi
