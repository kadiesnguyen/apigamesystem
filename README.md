# Game System Platform

A comprehensive gaming platform built with modern technologies, featuring a complete ecosystem for game management, player interactions, and real-time gaming experiences.

## 🏗️ Architecture

The platform consists of 6 integrated services:

| Service | Technology | Port | Description |
|---------|------------|------|-------------|
| **Game Server** | Bun + Elysia | 3000 | WebSocket game logic and real-time communication |
| **API Service** | Bun + Elysia | 3300 | REST API for CMS operations and game management |
| **CMS Frontend** | React + Vite | 5173 | Management dashboard and admin interface |
| **PostgreSQL** | PostgreSQL 17 | 5432 | Main database (game data, users, transactions) |
| **Redis** | Redis 7 | 6379 | Caching and session management |
| **MongoDB** | MongoDB 7 | 27017 | Logging and analytics storage |

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Make (usually pre-installed on macOS/Linux)
- At least 4GB RAM
- Available ports: Check `.env` file for current port configuration

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd apigamesystem
   ```

2. **Set up environment:**
   ```bash
   make setup-env  # Create .env from template
   # Edit .env and update all passwords/secrets!
   ```

3. **Start all services:**
   ```bash
   make install    # First-time setup with checks
   # or
   make start      # Quick start
   ```

4. **Verify all services are healthy:**
   ```bash
   make status     # Check service status
   make health     # Check health endpoints
   ```

5. **Access the platform:**
   ```bash
   make urls       # Display all service URLs and credentials
   ```
   - **CMS Dashboard**: http://localhost:5173
   - **API Health Check**: http://localhost:3300/health
   - **Game Server Health**: http://localhost:3000/health

## 🔐 Access Credentials

### CMS Admin Login
- **URL**: http://localhost:5173
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Super Administrator

### API Authentication
```bash
curl -X POST http://localhost:3300/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## ⚙️ Configuration

All system configuration is centralized in a `.env` file (created from `.env.template`):

- **Service Ports**: API, Server, CMS, and database ports
- **Database Credentials**: PostgreSQL, Redis, MongoDB connection details
- **JWT Secrets**: Authentication and session management
- **Service URLs**: Internal and external service communication

### Initial Setup
```bash
# Create environment file from template
make setup-env

# Edit configuration (REQUIRED!)
nano .env

# Validate configuration
make check-env

# Check port availability
make check-ports
```

### ⚠️ Security Requirements
**IMPORTANT**: After running `make setup-env`, you MUST update these values in `.env`:
- `POSTGRES_PASSWORD` - Strong database password
- `REDIS_PASSWORD` - Strong Redis password  
- `JWT_SECRET` - Long random string for JWT signing
- `JWT_ACCESS_SECRET` - Long random string for access tokens
- `JWT_REFRESH_SECRET` - Long random string for refresh tokens

### Environment File Management
```bash
# Set up initial environment
make setup-env

# Check Git status of environment files
make git-status

# Clean up old individual .env files
make clean-env

# Validate current configuration
make check-env
```

### Production Deployment
```bash
# Create production environment template
make env-production

# Edit .env.production with real production values
nano .env.production

# Deploy with production environment
cp .env.production .env
make start
```

**Production Checklist:**
1. ✅ Update all passwords with strong, unique values
2. ✅ Generate secure JWT secrets (use random strings)
3. ✅ Set `NODE_ENV=production`
4. ✅ Update domain names for production URLs
5. ✅ Never commit `.env` or `.env.production` to Git!

## 🛠️ Development

### Available Make Commands
```bash
# Get help with all available commands
make help

# Basic operations
make start          # Start all services
make stop           # Stop services (preserve data)
make restart        # Restart all services
make status         # Show service status
make urls           # Display service URLs

# Development
make dev            # Start with logs
make rebuild        # Rebuild and restart
make logs           # View all logs
make logs-api       # View API logs only
make health         # Check service health

# Database access
make db-postgres    # Connect to PostgreSQL
make db-mongo       # Connect to MongoDB  
make db-redis       # Connect to Redis CLI

# Container shells
make shell-api      # Open shell in API container
make shell-server   # Open shell in Server container
make shell-cms      # Open shell in CMS container

# Maintenance
make backup-db      # Backup PostgreSQL database
make clean          # Remove all data (destructive)
make test-api       # Test API endpoints
```

## 📊 Database Schema

The PostgreSQL database includes 9 core tables:
- `admin_users` - CMS user accounts
- `admin_sessions` - Authentication sessions  
- `games` - Game catalog and configurations
- `partners` - API partner accounts
- `partner_games` - Partner-specific game settings
- `partner_sessions` - Partner authentication
- `players` - Game players
- `player_accounts` - Player wallet accounts
- `account_ledger` - Transaction history

## 🎮 Game Server API

### Partner Authentication Required
All Server API endpoints require signed requests with these headers:
- `x-api-key`: Partner API key
- `x-timestamp`: Request timestamp
- `x-signature`: HMAC-SHA256 signature

### Available Partners
| Partner | API Key | Secret Key |
|---------|---------|-----------|
| Partner ABC | `partner_abc` | `74286262f408` |
| Partner Test | `partner_test` | `[check database]` |

### Example API Usage
```bash
# Generate signature and test user registration
# See test-server-auth.js for signature generation
```

## 🔧 API Endpoints

### CMS API (Port 3300)
- `GET /health` - Service health check
- `POST /api/auth/login` - Admin authentication
- `POST /api/auth/refresh` - Token refresh
- `GET /api/games` - Game catalog
- `GET /api/players/:id` - Player information
- `POST /api/wallets/:id/deposit` - Wallet transactions

### Game Server (Port 3000)  
- `GET /health` - Service health check
- `POST /api/user/register` - Player registration
- `POST /api/user/login` - Player authentication
- `POST /api/user/token` - Token consumption

## 🚨 Troubleshooting

### Service Status Issues
```bash
# Check if all containers are running
docker-compose ps

# Check service logs for errors
docker-compose logs api
docker-compose logs server
```

### Database Connection Issues
```bash
# Verify database connectivity
docker-compose exec api bun run --env-file=.env -e "console.log('Testing DB connection...')"

# Check database tables
docker-compose exec postgres psql -U gameserver -d game -c "\dt"
```

### CMS Proxy Issues
If CMS cannot reach the API service:
1. Use direct API access: http://localhost:3300/api/*
2. Check network connectivity: `docker-compose exec cms ping api`
3. Verify environment variables in CMS container

### Health Check Failures
If services show as unhealthy:
```bash
# Rebuild containers (health checks use wget, not curl)
docker-compose build
docker-compose up -d
```

## 🔒 Security Notes

### Development Environment
- Default passwords are set for development convenience
- All services run with development configurations
- CORS is enabled for cross-origin requests

### Production Deployment
Before production deployment:
1. Change all default passwords
2. Use environment-specific configurations
3. Enable SSL/TLS encryption
4. Implement proper logging and monitoring
5. Set up backup strategies for databases
6. Review and harden security settings

## 📈 Monitoring

### Service Health Checks
All services include health check endpoints that verify:
- Service availability
- Database connectivity  
- Redis/MongoDB connections
- Basic functionality

### Log Locations
- Application logs: Docker container outputs
- Database logs: PostgreSQL container logs
- Game logs: MongoDB collections
- Access logs: API service logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker Compose
5. Submit a pull request

## 📄 License

[Add your license information here]

---

**Happy Gaming! 🎮🚀**