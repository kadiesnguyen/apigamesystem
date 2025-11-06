# Game System Makefile
# Provides convenient commands for managing the Docker-based game system

# Colors for output
BLUE = \033[0;34m
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m

# Default target
.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)🎮 Game System - Available Commands$(NC)"
	@echo "===================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(BLUE)%-20s$(NC) %s\n", $$1, $$2}'

.PHONY: check-docker
check-docker: ## Check if Docker is running
	@echo "$(BLUE)Checking Docker status...$(NC)"
	@if ! docker info > /dev/null 2>&1; then \
		echo "$(RED)❌ Docker is not running. Please start Docker first.$(NC)"; \
		exit 1; \
	fi
	@if ! command -v docker-compose > /dev/null 2>&1; then \
		echo "$(RED)❌ Docker Compose is not installed.$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Docker is ready$(NC)"

.PHONY: check-ports
check-ports: ## Check if required ports are available
	@echo "$(BLUE)Checking required ports...$(NC)"
	@if [ -f .env ]; then \
		API_PORT=$$(grep "^API_PORT=" .env | cut -d'=' -f2); \
		SERVER_PORT=$$(grep "^SERVER_PORT=" .env | cut -d'=' -f2); \
		CMS_PORT=$$(grep "^CMS_PORT=" .env | cut -d'=' -f2); \
		POSTGRES_PORT=$$(grep "^POSTGRES_PORT=" .env | cut -d'=' -f2); \
		REDIS_PORT=$$(grep "^REDIS_PORT=" .env | cut -d'=' -f2); \
		MONGO_PORT=$$(grep "^MONGO_PORT=" .env | cut -d'=' -f2); \
		for port in $$API_PORT $$SERVER_PORT $$CMS_PORT $$POSTGRES_PORT $$REDIS_PORT $$MONGO_PORT; do \
			if lsof -Pi :$$port -sTCP:LISTEN -t >/dev/null 2>&1; then \
				echo "$(YELLOW)⚠️  Warning: Port $$port is already in use$(NC)"; \
			else \
				echo "$(GREEN)✅ Port $$port is available$(NC)"; \
			fi \
		done \
	else \
		echo "$(RED)❌ .env file not found$(NC)"; \
		exit 1; \
	fi

.PHONY: check-env
check-env: ## Validate environment configuration
	@echo "$(BLUE)Checking environment configuration...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(RED)❌ .env file not found$(NC)"; \
		echo "$(YELLOW)💡 Run 'make setup-env' to create from template$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ .env file exists$(NC)"
	@echo "$(BLUE)Environment variables:$(NC)"
	@grep -E "^(API_PORT|SERVER_PORT|CMS_PORT|POSTGRES_DB|REDIS_PASSWORD|JWT_SECRET)" .env | sed 's/=.*PASSWORD.*/=***HIDDEN***/' | sed 's/=.*SECRET.*/=***HIDDEN***/'
	@echo "$(GREEN)✅ Environment configuration loaded$(NC)"

.PHONY: setup-env
setup-env: ## Create .env from .env.template
	@echo "$(BLUE)Setting up environment configuration...$(NC)"
	@if [ -f .env ]; then \
		echo "$(YELLOW)⚠️  .env file already exists$(NC)"; \
		read -p "Overwrite existing .env? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1; \
	fi
	@if [ ! -f .env.template ]; then \
		echo "$(RED)❌ .env.template not found$(NC)"; \
		exit 1; \
	fi
	@cp .env.template .env
	@echo "$(GREEN)✅ .env created from template$(NC)"
	@echo "$(YELLOW)⚠️  IMPORTANT: Update passwords and secrets in .env before starting!$(NC)"
	@echo "$(BLUE)Required changes:$(NC)"
	@echo "  • POSTGRES_PASSWORD"
	@echo "  • REDIS_PASSWORD" 
	@echo "  • JWT_SECRET"
	@echo "  • JWT_ACCESS_SECRET"
	@echo "  • JWT_REFRESH_SECRET"

.PHONY: start
start: check-docker check-env ## Start all game system services
	@echo "$(BLUE)🎮 Starting Game System services...$(NC)"
	@echo "This may take a few minutes on first run..."
	@docker-compose up --build -d
	@sleep 5
	@make status
	@make urls

.PHONY: stop
stop: ## Stop all services (preserves data)
	@echo "$(BLUE)🛑 Stopping Game System...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ All services stopped (data preserved)$(NC)"

.PHONY: restart
restart: ## Restart all services
	@echo "$(BLUE)🔄 Restarting Game System...$(NC)"
	@docker-compose restart
	@sleep 3
	@make status

.PHONY: rebuild
rebuild: ## Rebuild and restart all services
	@echo "$(BLUE)🔨 Rebuilding Game System...$(NC)"
	@docker-compose down
	@docker-compose build --no-cache
	@docker-compose up -d
	@sleep 5
	@make status

.PHONY: clean
clean: ## Stop services and remove all data (destructive)
	@echo "$(YELLOW)⚠️  This will remove all data including databases!$(NC)"
	@read -p "Are you sure? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "$(YELLOW)Removing all volumes and data...$(NC)"
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@echo "$(RED)🗑️  All data has been removed$(NC)"

.PHONY: status
status: ## Show status of all services
	@echo "$(BLUE)Service Status:$(NC)"
	@docker-compose ps

.PHONY: urls
urls: ## Display service URLs
	@echo ""
	@echo "$(GREEN)🚀 Game System URLs:$(NC)"
	@echo "===================================="
	@echo "$(BLUE)Application Services:$(NC)"
	@echo "  📱 CMS Frontend:  http://localhost:5173"
	@echo "  🔌 API Service:   http://localhost:3300"
	@echo "  🎮 Game Server:   http://localhost:3000"
	@echo ""
	@echo "$(BLUE)Database Services:$(NC)"
	@echo "  🐘 PostgreSQL:    localhost:5432"
	@echo "  🔴 Redis:         localhost:6379"  
	@echo "  🍃 MongoDB:       localhost:27017"
	@echo ""
	@echo "$(BLUE)Login Credentials:$(NC)"
	@echo "  👤 CMS Admin:     admin / admin123"
	@echo ""

.PHONY: logs
logs: ## Show logs for all services
	@docker-compose logs -f

.PHONY: logs-api
logs-api: ## Show logs for API service only
	@docker-compose logs -f api

.PHONY: logs-server
logs-server: ## Show logs for Server service only
	@docker-compose logs -f server

.PHONY: logs-cms
logs-cms: ## Show logs for CMS service only
	@docker-compose logs -f cms

.PHONY: logs-db
logs-db: ## Show logs for database services
	@docker-compose logs -f postgres redis mongodb

.PHONY: shell-api
shell-api: ## Open shell in API container
	@docker-compose exec api sh

.PHONY: shell-server
shell-server: ## Open shell in Server container
	@docker-compose exec server sh

.PHONY: shell-cms
shell-cms: ## Open shell in CMS container
	@docker-compose exec cms sh

.PHONY: db-postgres
db-postgres: ## Connect to PostgreSQL database
	@docker-compose exec postgres psql -U gameserver -d game

.PHONY: db-redis
db-redis: ## Connect to Redis CLI
	@docker-compose exec redis redis-cli -a strong_redis_password

.PHONY: db-mongo
db-mongo: ## Connect to MongoDB CLI
	@docker-compose exec mongodb mongosh

.PHONY: health
health: ## Check health of all services
	@echo "$(BLUE)Health Check Results:$(NC)"
	@echo "======================"
	@echo "$(BLUE)API Service:$(NC)"
	@curl -s http://localhost:3300/health | jq '.' 2>/dev/null || echo "$(RED)❌ API not responding$(NC)"
	@echo "$(BLUE)Game Server:$(NC)"
	@curl -s http://localhost:3000/health | jq '.' 2>/dev/null || echo "$(RED)❌ Server not responding$(NC)"
	@echo "$(BLUE)CMS Frontend:$(NC)"
	@curl -s -o /dev/null -w "$(GREEN)✅ HTTP %{http_code}$(NC)\n" http://localhost:5173 2>/dev/null || echo "$(RED)❌ CMS not responding$(NC)"

.PHONY: backup-db
backup-db: ## Backup PostgreSQL database
	@echo "$(BLUE)Creating database backup...$(NC)"
	@mkdir -p backups
	@docker-compose exec postgres pg_dump -U gameserver game > backups/game_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Database backed up to backups/ directory$(NC)"

.PHONY: clean-env
clean-env: ## Remove old individual service .env files
	@echo "$(YELLOW)⚠️  This will remove old .env files from individual services$(NC)"
	@echo "$(BLUE)Files to be removed:$(NC)"
	@ls -la api/.env cms/.env Server/.env.save .env.docker 2>/dev/null || echo "$(GREEN)No old .env files found$(NC)"
	@echo ""
	@read -p "Continue with cleanup? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	@rm -f api/.env cms/.env Server/.env.save .env.docker
	@echo "$(GREEN)✅ Old .env files removed$(NC)"
	@echo "$(BLUE)💡 All configuration is now in the root .env file$(NC)"

.PHONY: git-status
git-status: ## Show Git status with focus on environment files
	@echo "$(BLUE)Git Status - Environment Files:$(NC)"
	@echo "================================="
	@git status --porcelain | grep -E "\.(env|gitignore)" || echo "$(GREEN)✅ No environment file changes$(NC)"
	@echo ""
	@echo "$(BLUE)Tracked .env files (should be none):$(NC)"
	@git ls-files | grep "\.env" || echo "$(GREEN)✅ No .env files tracked (secure!)$(NC)"
	@echo ""
	@echo "$(BLUE)Full Git Status:$(NC)"
	@git status --short

.PHONY: git-remove-env
git-remove-env: ## Remove all .env files from Git tracking
	@echo "$(BLUE)Removing .env files from Git tracking...$(NC)"
	@echo "$(YELLOW)⚠️  This will untrack all .env files but keep them locally$(NC)"
	@echo ""
	@git ls-files | grep "\.env" || (echo "$(GREEN)✅ No .env files currently tracked$(NC)" && exit 0)
	@echo ""
	@read -p "Continue with removing .env files from Git? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	@git ls-files | grep "\.env" | xargs -r git rm --cached
	@echo "$(GREEN)✅ .env files removed from Git tracking$(NC)"
	@echo "$(BLUE)💡 Files remain on disk but are no longer tracked$(NC)"

.PHONY: env-production
env-production: ## Create production environment template
	@echo "$(BLUE)Creating production environment template...$(NC)"
	@if [ ! -f .env.template ]; then \
		echo "$(RED)❌ .env.template not found$(NC)"; \
		exit 1; \
	fi
	@cp .env.template .env.production
	@sed -i.bak 's/NODE_ENV=development/NODE_ENV=production/' .env.production
	@sed -i.bak 's/your_.*_here/CHANGE_ME_FOR_PRODUCTION/' .env.production
	@sed -i.bak 's/localhost/your-production-domain.com/' .env.production
	@rm .env.production.bak
	@echo "$(GREEN)✅ .env.production created$(NC)"
	@echo "$(YELLOW)⚠️  IMPORTANT: Update all values in .env.production before deployment!$(NC)"
	@echo "$(RED)🔒 Never commit .env.production to Git!$(NC)"

.PHONY: test-api
test-api: ## Test API endpoints
	@echo "$(BLUE)Testing API endpoints...$(NC)"
	@echo "$(BLUE)Health Check:$(NC)"
	@curl -s http://localhost:3300/health
	@echo ""
	@echo "$(BLUE)Login Test:$(NC)"
	@curl -s -X POST http://localhost:3300/api/auth/login \
		-H "Content-Type: application/json" \
		-d '{"username":"admin","password":"admin123"}' | head -c 100
	@echo ""
	@echo "$(BLUE)Games List:$(NC)"
	@curl -s http://localhost:3300/api/games | head -c 200
	@echo ""

.PHONY: dev
dev: ## Start in development mode with logs
	@make start
	@make logs

.PHONY: prod
prod: ## Start in production mode (detached)
	@echo "$(BLUE)🚀 Starting in production mode...$(NC)"
	@docker-compose -f docker-compose.yml up -d
	@make status
	@make urls

.PHONY: update
update: ## Pull latest images and restart
	@echo "$(BLUE)📥 Updating system...$(NC)"
	@docker-compose pull
	@make rebuild

.PHONY: install
install: check-docker setup-env check-ports ## Initial setup and installation
	@echo "$(GREEN)🎉 Welcome to Game System Setup!$(NC)"
	@echo "================================="
	@echo "$(BLUE)This will:$(NC)"
	@echo "  • Set up environment configuration"
	@echo "  • Validate environment settings"
	@echo "  • Build all Docker containers"
	@echo "  • Set up databases"
	@echo "  • Start all services"
	@echo ""
	@read -p "Continue with installation? [Y/n]: " confirm && [ "$$confirm" != "n" ] || exit 1
	@make check-env
	@make start
	@echo ""
	@echo "$(GREEN)🎉 Installation complete!$(NC)"
	@echo "$(YELLOW)💡 Try 'make help' to see all available commands$(NC)"

# Development shortcuts
.PHONY: up down ps
up: start     ## Alias for start
down: stop    ## Alias for stop  
ps: status    ## Alias for status