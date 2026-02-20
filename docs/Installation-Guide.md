# G.R.I.P. Installation Guide

This guide provides detailed instructions for installing and configuring G.R.I.P. (GitHub Repo-Analysis Intellectual Partner) in various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Production Installation](#production-installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [AI Configuration](#ai-configuration)
- [Testing Installation](#testing-installation)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before beginning installation, ensure your system meets the following requirements:

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Ubuntu 20.04+
- **CPU**: Dual core or better
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 1GB free space minimum

### Software Requirements

- **Node.js**: v16.x or higher ([Download](https://nodejs.org/))
- **npm**: v8.x or higher (included with Node.js)
- **Git**: Latest version ([Download](https://git-scm.com/))
- **MongoDB Atlas Account**: For database hosting
- **Anthropic API Key**: For AI functionality

## Local Development Setup

Follow these steps to set up G.R.I.P. for local development:

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/grip.git
cd grip
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit the `.env.local` file and add your configuration values (see [Environment Configuration](#environment-configuration) for details).

### 4. Start Development Server

```bash
npm run dev
```

This will start the development server at [http://localhost:3000](http://localhost:3000).

## Production Installation

For deploying G.R.I.P. to a production environment:

### 1. Clone and Install

Follow steps 1-3 from the local development setup.

### 2. Build the Application

```bash
npm run build
```

### 3. Start Production Server

```bash
npm start
```

### 4. Using Process Manager (Recommended)

For better reliability, use a process manager like PM2:

```bash
npm install -g pm2
pm2 start npm --name "grip" -- start
```

To ensure the application restarts after system reboot:

```bash
pm2 startup
pm2 save
```

## Environment Configuration

G.R.I.P. requires several environment variables to function properly:

### Core Variables

```
# Server Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Database
MONGODB_URI=your_mongodb_uri

# AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key

# GitHub Integration
GITHUB_ID=your_github_oauth_client_id
GITHUB_SECRET=your_github_oauth_client_secret

# WebSocket (for real-time features)
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001
```

### Additional Configuration

```
# Performance
ENABLE_RESPONSE_CACHE=true
API_CACHE_DURATION=3600

# Logging
LOG_LEVEL=info

# Security
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_DURATION=60
```

## Database Setup

G.R.I.P. uses MongoDB Atlas for database storage:

### 1. Create MongoDB Atlas Account

Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).

### 2. Create a New Cluster

- Log in to your MongoDB Atlas account
- Click "Create a New Cluster"
- Choose your preferred cloud provider and region
- Select cluster tier (M0 Sandbox is free and sufficient for development)
- Name your cluster
- Click "Create Cluster"

### 3. Configure Database Access

- Create a database user:
  - Go to "Database Access" under Security
  - Click "Add New Database User"
  - Choose password authentication
  - Create a username and password
  - Set appropriate access permissions (read/write to any database)
  - Click "Add User"

### 4. Configure Network Access

- Go to "Network Access" under Security
- Click "Add IP Address"
- Add your current IP address or use 0.0.0.0/0 for all IPs (not recommended for production)
- Click "Confirm"

### 5. Get Connection String

- Go to "Clusters" under Deployment
- Click "Connect" on your cluster
- Choose "Connect your application"
- Copy the connection string
- Replace `<password>` with your database user's password
- Add this string to your `.env.local` as `MONGODB_URI`

## AI Configuration

G.R.I.P. uses Anthropic's Claude for AI functionality:

### 1. Create Anthropic Account

Sign up at [Anthropic](https://www.anthropic.com/).

### 2. Get API Key

- Navigate to your account settings or API section
- Generate a new API key
- Copy the key and add it to your `.env.local` as `ANTHROPIC_API_KEY`

## Testing Installation

Verify your installation is working correctly:

### 1. Run Tests

```bash
npm test
```

All tests should pass with no errors.

### 2. Verification Checklist

- ✅ Application starts without errors
- ✅ MongoDB connection successful
- ✅ Authentication works properly
- ✅ API calls to Anthropic succeed
- ✅ WebSocket connection established

## Troubleshooting

Common installation issues and their solutions:

### MongoDB Connection Issues

**Problem**: Unable to connect to MongoDB database

**Solutions**:
- Verify the MongoDB URI is correct
- Ensure the database user has the proper permissions
- Check if the current IP address is whitelisted in MongoDB Atlas
- Test the connection string in MongoDB Compass

### Node.js Version Conflicts

**Problem**: Errors related to Node.js version

**Solutions**:
- Verify you're using Node.js v16 or higher
- Try using nvm (Node Version Manager) to switch Node versions:
  ```bash
  nvm install 16
  nvm use 16
  ```

### Anthropic API Key Issues

**Problem**: AI functionality not working

**Solutions**:
- Verify the API key is correctly entered in `.env.local`
- Check if you've reached your API usage limit
- Ensure your account is active and in good standing

### Port Conflicts

**Problem**: Port 3000 already in use

**Solutions**:
- Kill any processes using port 3000:
  ```bash
  npx kill-port 3000
  ```
- Or configure a different port in `.env.local`:
  ```
  PORT=3001
  ```

### WebSocket Connection Issues

**Problem**: Real-time features not working

**Solutions**:
- Verify WebSocket environment variables are set correctly
- Check if firewall is blocking WebSocket connections
- Ensure the WebSocket server is running 