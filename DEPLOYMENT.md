# WhatsApp n8n Deployment Guide

This guide provides instructions for deploying the WhatsApp n8n integration on any machine using Docker.

## Prerequisites

- Docker and Docker Compose installed on the target machine
- Git installed (optional, for Method 1)
- Internet connection for downloading dependencies

## Method 1: Using Git and Docker Compose (Recommended)

### Step 1: Install Docker and Docker Compose

**For Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
```

**For CentOS/RHEL:**
```bash
sudo yum install -y docker docker-compose
sudo systemctl enable docker
sudo systemctl start docker
```

**For macOS/Windows:**
Download and install Docker Desktop from https://www.docker.com/products/docker-desktop

### Step 2: Clone the repository

```bash
git clone https://github.com/MahmedRahman/whats-app-n8n.git
cd whats-app-n8n
```

### Step 3: Configure environment variables

Create a `.env.docker` file for Docker deployment:
```bash
nano .env.docker
```

Add the following content and update with your settings:
```
# WhatsApp API Configuration
WHATSAPP_API_TOKEN=your_whatsapp_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# n8n Webhook Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/your-webhook-id

# Port configuration
PORT=3002
```

### Step 4: Start the application

```bash
docker-compose up -d
```

### Step 5: View logs

```bash
docker-compose logs -f
```

### Step 6: Access the application

Open a browser and navigate to:
```
http://your-server-ip:3002
```

### Step 7: Scan the QR code

Use your WhatsApp mobile app to scan the QR code displayed in the web interface.

## Method 2: Manual Setup (Without Git)

If you don't want to clone the entire repository, you can create just the necessary files on the new machine:

### Step 1: Create project directory

```bash
mkdir whatsapp-n8n
cd whatsapp-n8n
```

### Step 2: Create Dockerfile

```bash
nano Dockerfile
```

Paste the following content:
```dockerfile
FROM node:18-slim

# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xvfb \
    fonts-freefont-ttf \
    git \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create app directory
WORKDIR /usr/src/app

# Clone the repository
RUN git clone https://github.com/MahmedRahman/whats-app-n8n.git .

# Install app dependencies
RUN npm install

# Create directory for WhatsApp session data
RUN mkdir -p .wwebjs_auth

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

### Step 3: Create docker-compose.yml

```bash
nano docker-compose.yml
```

Paste the following content:
```yaml
services:
  whatsapp-n8n:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: whatsapp-n8n
    restart: unless-stopped
    ports:
      - "3002:3000"
    volumes:
      - ./data:/usr/src/app/.wwebjs_auth
      - ./.env:/usr/src/app/.env
    environment:
      - NODE_ENV=production
      - TZ=UTC
    shm_size: '1gb'
```

### Step 4: Create .env file

```bash
nano .env
```

Paste and modify:
```
# WhatsApp API Configuration
WHATSAPP_API_TOKEN=your_whatsapp_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# n8n Webhook Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/your-webhook-id
```

### Step 5: Create data directory

```bash
mkdir data
```

### Step 6: Start the application

```bash
docker-compose up -d
```

## Troubleshooting

### Port conflicts

If port 3001 is already in use, modify the port mapping in docker-compose.yml:
```yaml
ports:
  - "3002:3000"  # Change 3002 to any available port
```

### WhatsApp authentication issues

- Make sure you can access the web interface to scan the QR code
- Check logs with `docker-compose logs -f`
- If the QR code doesn't appear, restart the container: `docker-compose restart`

### Container crashes

Check logs for errors: `docker-compose logs -f`

### Webhook not working

- Verify your N8N_WEBHOOK_URL is correct in the .env file
- Make sure your n8n instance is accessible from the container

## Maintenance

### Updating the application

```bash
# Method 1 (with Git):
git pull
docker-compose down
docker-compose up -d

# Method 2 (without Git):
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backing up data

Regularly backup the data directory which contains WhatsApp session information:
```bash
cp -r data data_backup_$(date +%Y%m%d)
```
