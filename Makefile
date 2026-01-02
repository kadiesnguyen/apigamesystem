# ===========================================
# JILI GAMES - DOCKER MANAGEMENT MAKEFILE
# ===========================================

.PHONY: help build up down restart logs ps clean setup dev prod

# Default target
help:
	@echo "============================================"
	@echo "  JILI GAMES - Docker Management Commands"
	@echo "============================================"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make setup      - Initial setup (copy env, build, start)"
	@echo "  make env        - Copy .env.example to .env"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make build      - Build all Docker images"
	@echo "  make up         - Start all services"
	@echo "  make down       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make ps         - Show running containers"
	@echo "  make logs       - Show logs (all services)"
	@echo ""
	@echo "Service-specific logs:"
	@echo "  make logs-gameserver  - Game server logs"
	@echo "  make logs-api         - API server logs"
	@echo "  make logs-cms         - CMS frontend logs"
	@echo "  make logs-postgres    - PostgreSQL logs"
	@echo "  make logs-redis       - Redis logs"
	@echo "  make logs-mongodb     - MongoDB logs"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev        - Start in development mode"
	@echo "  make prod       - Start in production mode"
	@echo ""
	@echo "Database Commands:"
	@echo "  make db-shell   - Open PostgreSQL shell"
	@echo "  make redis-cli  - Open Redis CLI"
	@echo "  make mongo-shell - Open MongoDB shell"
	@echo ""
	@echo "Cleanup Commands:"
	@echo "  make clean      - Stop and remove containers, networks"
	@echo "  make clean-all  - Clean + remove volumes (DATA LOSS!)"
	@echo "  make prune      - Remove unused Docker resources"
	@echo ""

# ===========================================
# SETUP
# ===========================================

env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env file from .env.example"; \
		echo "Please update the values in .env before starting"; \
	else \
		echo ".env file already exists"; \
	fi

setup: env build up
	@echo ""
	@echo "============================================"
	@echo "  Setup complete!"
	@echo "============================================"
	@echo ""
	@echo "Services are starting up..."
	@echo ""
	@echo "Access URLs:"
	@echo "  - Game Server HTTP: http://localhost:3000"
	@echo "  - Game Server WS:   ws://localhost:3001"
	@echo "  - CMS API:          http://localhost:3300"
	@echo "  - CMS Frontend:     http://localhost:80"
	@echo ""
	@echo "Run 'make logs' to view logs"
	@echo "Run 'make ps' to check container status"
	@echo ""

# ===========================================
# DOCKER COMMANDS
# ===========================================

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

restart: down up

ps:
	docker-compose ps

logs:
	docker-compose logs -f

logs-gameserver:
	docker-compose logs -f gameserver

logs-api:
	docker-compose logs -f api

logs-cms:
	docker-compose logs -f cms

logs-postgres:
	docker-compose logs -f postgres

logs-redis:
	docker-compose logs -f redis

logs-mongodb:
	docker-compose logs -f mongodb

# ===========================================
# DEVELOPMENT & PRODUCTION
# ===========================================

dev:
	NODE_ENV=development docker-compose up -d

prod:
	NODE_ENV=production docker-compose up -d

# ===========================================
# DATABASE SHELLS
# ===========================================

db-shell:
	docker-compose exec postgres psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-jili_game}

redis-cli:
	docker-compose exec redis redis-cli -a $${REDIS_PASSWORD:-redis123}

mongo-shell:
	docker-compose exec mongodb mongosh -u $${MONGO_USER:-mongo} -p $${MONGO_PASSWORD:-mongo123} --authenticationDatabase admin $${MONGO_DB:-jili_logs}

# ===========================================
# CLEANUP
# ===========================================

clean:
	docker-compose down --remove-orphans
	@echo "Containers and networks removed"

clean-all:
	@echo "WARNING: This will delete all data volumes!"
	@read -p "Are you sure? [y/N] " confirm && [ $${confirm:-N} = y ]
	docker-compose down -v --remove-orphans
	@echo "Containers, networks, and volumes removed"

prune:
	docker system prune -f
	@echo "Unused Docker resources removed"

# ===========================================
# HEALTH CHECK
# ===========================================

health:
	@echo "Checking service health..."
	@echo ""
	@echo "Game Server:"
	@curl -s http://localhost:3000/health || echo "  Not responding"
	@echo ""
	@echo "API Server:"
	@curl -s http://localhost:3300/health || echo "  Not responding"
	@echo ""
	@echo "CMS Frontend:"
	@curl -s http://localhost:80/health || echo "  Not responding"
	@echo ""

# ===========================================
# UTILITY
# ===========================================

shell-gameserver:
	docker-compose exec gameserver sh

shell-api:
	docker-compose exec api sh

shell-cms:
	docker-compose exec cms sh