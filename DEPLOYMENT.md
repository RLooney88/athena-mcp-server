# Deployment Guide for Athena MCP Server

This guide covers deploying the Athena MCP server to production with proper security, monitoring, and reliability considerations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Methods](#deployment-methods)
4. [Environment Configuration](#environment-configuration)
5. [Security Considerations](#security-considerations)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: Version 18.0 or higher
- **Memory**: Minimum 512MB RAM (1GB recommended)
- **Disk**: Minimum 100MB for application files
- **Network**: Outbound HTTPS access to Athena API

### Required Access

- Athena API production credentials (token)
- Production API endpoint URL
- SSH access to deployment target (if applicable)
- sudo/admin access for service installation

---

## Pre-Deployment Checklist

### 1. Code Preparation

```bash
# Clone and prepare
git clone <repository>
cd athena-mcp-server

# Install dependencies
npm ci

# Build TypeScript
npm run build

# Run tests
npm test

# Verify build output
ls -la dist/
```

### 2. Configuration Review

- [ ] All environment variables documented
- [ ] API URLs verified for production
- [ ] Authentication tokens generated
- [ ] Logging level set appropriately
- [ ] Request timeout configured

### 3. Security Review

- [ ] No hardcoded credentials
- [ ] Environment variables used for secrets
- [ ] SSL/TLS certificates available (if needed)
- [ ] Network security groups configured

### 4. Documentation

- [ ] Runbook created for operations
- [ ] Contact information updated
- [ ] Escalation procedures documented

---

## Deployment Methods

### Method 1: Direct Process (Development/Testing)

```bash
# Set environment
export NODE_ENV=production
export API_URL=https://api.athena.example.com
export AUTH_TOKEN=your_token

# Start server
npm start

# Run in background
nohup npm start > /var/log/athena-mcp.log 2>&1 &
```

**Pros**: Simple, easy to debug
**Cons**: No process management, manual restart required

---

### Method 2: PM2 Process Manager (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'athena-mcp',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'warn'
    },
    env_production: {
      NODE_ENV: 'production',
      API_URL: 'https://api.athena.example.com',
      AUTH_TOKEN: 'your_token_here',
      LOG_LEVEL: 'warn'
    }
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js --env production

# Setup startup script
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs athena-mcp
pm2 status
```

**Pros**: Process management, auto-restart, logging, clustering
**Cons**: Requires PM2 installation

---

### Method 3: systemd Service (Linux)

```bash
# Create service user
sudo useradd -r -s /sbin/nologin athena-mcp

# Create service file
sudo cat > /etc/systemd/system/athena-mcp.service << 'EOF'
[Unit]
Description=Athena MCP Server
After=network.target

[Service]
Type=simple
User=athena-mcp
Group=athena-mcp
WorkingDirectory=/opt/athena-mcp
ExecStart=/usr/bin/node /opt/athena-mcp/dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/athena-mcp/.env

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=athena-mcp

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/athena-mcp/logs

[Install]
WantedBy=multi-user.target
EOF

# Setup application
sudo mkdir -p /opt/athena-mcp
sudo cp -r . /opt/athena-mcp/
sudo chown -R athena-mcp:athena-mcp /opt/athena-mcp

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable athena-mcp
sudo systemctl start athena-mcp
sudo systemctl status athena-mcp

# View logs
sudo journalctl -u athena-mcp -f
```

**Pros**: System integration, security features, logging
**Cons**: More complex setup

---

### Method 4: Docker Container

```bash
# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY dist ./dist
COPY .env.example ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S athena -u 1001 -G nodejs
USER athena

EXPOSE 3000

CMD ["node", "dist/server.js"]
EOF

# Build and run
docker build -t athena-mcp:latest .
docker run -d \
  --name athena-mcp \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e API_URL=https://api.athena.example.com \
  -e AUTH_TOKEN=your_token \
  athena-mcp:latest

# Or use docker-compose
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  athena-mcp:
    image: athena-mcp:latest
    container_name: athena-mcp
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - API_URL=${API_URL}
      - AUTH_TOKEN=${AUTH_TOKEN}
      - LOG_LEVEL=warn
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF

docker-compose up -d
```

**Pros**: Isolation, reproducibility, easy scaling
**Cons**: Container management overhead

---

## Environment Configuration

### Production Environment Variables

Create `/opt/athena-mcp/.env`:

```bash
# Required
NODE_ENV=production
API_URL=https://api.athena.example.com
AUTH_TOKEN=your_production_token_here

# Optional
LOG_LEVEL=warn
REQUEST_TIMEOUT=30000
```

### Security Best Practices

1. **Use secrets management** (AWS Secrets Manager, HashiCorp Vault, etc.)
2. **Rotate tokens regularly** (every 90 days recommended)
3. **Limit API access** to specific IPs if possible
4. **Enable HTTPS** for all connections
5. **Never log sensitive data**

---

## Monitoring and Logging

### Health Checks

```bash
# Check process status
pm2 status athena-mcp
# or
systemctl status athena-mcp
# or
docker ps | grep athena-mcp
```

### Log Monitoring

```bash
# PM2 logs
pm2 logs athena-mcp

# systemd logs
journalctl -u athena-mcp -f

# Docker logs
docker logs -f athena-mcp
```

### Metrics to Monitor

- **Process uptime**: Should be close to 100%
- **Memory usage**: Should stay below 80%
- **Error rate**: Should be near 0%
- **API response time**: Should be < 5s
- **Connection failures**: Should be 0

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Memory Usage | > 70% | > 90% |
| Error Rate | > 1% | > 5% |
| Response Time | > 3s | > 10s |
| Uptime | < 99.9% | < 99% |

---

## Rollback Procedures

### PM2 Rollback

```bash
# List previous versions
pm2 list

# Restore previous version
pm2 revert athena-mcp
```

### Git Rollback

```bash
# Revert to previous commit
git revert HEAD
npm run build
pm2 restart athena-mcp
```

### Docker Rollback

```bash
# Revert to previous image
docker tag athena-mcp:previous athena-mcp:latest
docker restart athena-mcp
```

---

## Troubleshooting

### Server Won't Start

```bash
# Check error logs
pm2 logs athena-mcp --lines 50

# Common issues:
# - Missing environment variables
# - Invalid API credentials
# - Port already in use
# - Node.js version too old
```

### API Connection Failures

```bash
# Test API connectivity
curl -H "Authorization: Bearer $AUTH_TOKEN" $API_URL/health

# Check network access
nc -zv api.athena.example.com 443

# Verify DNS resolution
nslookup api.athena.example.com
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart if needed
pm2 restart athena-mcp

# Increase memory limit in ecosystem.config.js
max_memory_restart: '1G'
```

### Slow Response Times

```bash
# Check API latency
curl -w "\nTime: %{time_total}s\n" $API_URL/endpoint

# Review logs for bottlenecks
pm2 logs athena-mcp | grep -i "slow\|timeout"
```

---

## Checklist Summary

### Before Deployment
- [ ] Code reviewed and tested
- [ ] Configuration validated
- [ ] Security review completed
- [ ] Monitoring configured
- [ ] Rollback plan ready

### During Deployment
- [ ] Deploy during low-traffic period
- [ ] Monitor logs during deployment
- [ ] Verify health after deployment
- [ ] Test critical functionality

### After Deployment
- [ ] Confirm monitoring active
- [ ] Verify no errors in logs
- [ ] Test from client applications
- [ ] Update documentation
- [ ] Notify stakeholders

---

## Support

For deployment issues:
1. Check logs first: `pm2 logs athena-mcp`
2. Review troubleshooting section above
3. Verify environment configuration
4. Test API connectivity manually
5. Contact support with logs and error messages
