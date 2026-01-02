#!/bin/bash

# ===========================================
# JILI GAMES - AUTO SETUP & START SCRIPT
# ===========================================
# Script tự động setup và start toàn bộ hệ thống
# Bao gồm: Docker services + Direct process (gameserver, api, cms)

set -e  # Dừng nếu có lỗi

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Biến đường dẫn
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
GAMESERVER_DIR="$SERVER_DIR/gameserver"
API_DIR="$SERVER_DIR/api"
CMS_DIR="$SERVER_DIR/cms"

# Hàm in thông báo
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Hàm kiểm tra command có tồn tại
check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Hàm cài đặt Bun
install_bun() {
    info "Đang cài đặt Bun..."
    if [ -f "$HOME/.bun/bin/bun" ]; then
        success "Bun đã được cài đặt"
        return 0
    fi
    
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    if check_command bun; then
        success "Bun đã được cài đặt thành công"
        return 0
    else
        error "Không thể cài đặt Bun"
        return 1
    fi
}

# Hàm kiểm tra Docker
check_docker() {
    if ! check_command docker; then
        error "Docker chưa được cài đặt. Vui lòng cài đặt Docker trước."
        echo "Cài đặt Docker: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi
    
    if ! check_command docker-compose && ! docker compose version &> /dev/null; then
        error "Docker Compose chưa được cài đặt."
        exit 1
    fi
    
    success "Docker đã sẵn sàng"
}

# Hàm tạo file .env
create_env() {
    if [ -f "$SERVER_DIR/.env" ]; then
        warning "File .env đã tồn tại, bỏ qua..."
        return 0
    fi
    
    info "Đang tạo file .env..."
    
    if [ -f "$SERVER_DIR/.env.example" ]; then
        cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
        success "Đã tạo file .env từ .env.example"
        warning "Vui lòng kiểm tra và cập nhật file .env nếu cần"
    else
        # Tạo file .env mặc định
        cat > "$SERVER_DIR/.env" << 'EOF'
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=jili_game
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=redis123
REDIS_PORT=6379

# MongoDB
MONGO_USER=mongo
MONGO_PASSWORD=mongo123
MONGO_DB=jili_logs
MONGO_PORT=27017

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Ports
GAMESERVER_HTTP_PORT=3000
GAMESERVER_WS_PORT=3001
API_PORT=3300
CMS_PORT=80

# Environment
NODE_ENV=production
EOF
        success "Đã tạo file .env với giá trị mặc định"
    fi
}

# Hàm cài đặt dependencies cho một service
install_dependencies() {
    local service_dir=$1
    local service_name=$2
    
    if [ ! -d "$service_dir" ]; then
        error "Thư mục $service_name không tồn tại: $service_dir"
        return 1
    fi
    
    info "Đang cài đặt dependencies cho $service_name..."
    cd "$service_dir"
    
    if [ -f "package.json" ]; then
        # Sử dụng Bun nếu có, nếu không dùng npm
        if check_command bun; then
            export BUN_INSTALL="$HOME/.bun"
            export PATH="$BUN_INSTALL/bin:$PATH"
            bun install
        else
            npm install
        fi
        success "Đã cài đặt dependencies cho $service_name"
    else
        warning "$service_name không có package.json"
    fi
}

# Hàm build service
build_service() {
    local service_dir=$1
    local service_name=$2
    
    info "Đang build $service_name..."
    cd "$service_dir"
    
    if [ ! -f "package.json" ]; then
        warning "$service_name không có package.json"
        return 1
    fi
    
    # Kiểm tra script build
    if ! grep -q '"build"' package.json; then
        warning "$service_name không có script build"
        return 1
    fi
    
    # Build với error handling
    if check_command bun; then
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        if bun run build; then
            success "Đã build $service_name"
            return 0
        else
            error "Build $service_name thất bại"
            return 1
        fi
    else
        if npm run build; then
            success "Đã build $service_name"
            return 0
        else
            error "Build $service_name thất bại"
            return 1
        fi
    fi
}

# Hàm start Docker services (chỉ databases)
start_docker() {
    info "Đang khởi động Docker services (databases)..."
    cd "$SERVER_DIR"
    
    # Chỉ start database services (postgres, redis, mongodb)
    info "Đang start database containers..."
    docker-compose up -d postgres redis mongodb || docker compose up -d postgres redis mongodb
    
    # Đợi databases sẵn sàng
    info "Đang đợi databases khởi động..."
    sleep 10
    
    # Kiểm tra containers
    if docker-compose ps postgres redis mongodb 2>/dev/null | grep -q "Up" || docker compose ps postgres redis mongodb 2>/dev/null | grep -q "Up"; then
        success "Docker database services đã được khởi động"
    else
        warning "Một số Docker services có thể chưa sẵn sàng"
    fi
}

# Hàm cài đặt serve cho CMS
install_serve() {
    if check_command serve; then
        success "serve đã được cài đặt"
        return 0
    fi
    
    info "Đang cài đặt serve cho CMS..."
    if check_command bun; then
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        bun add -g serve 2>/dev/null || npm install -g serve
    else
        npm install -g serve
    fi
    
    if check_command serve; then
        success "serve đã được cài đặt"
    else
        warning "Không thể cài đặt serve, sẽ dùng npx serve"
    fi
}

# Hàm start services trực tiếp (không dùng PM2)
start_services() {
    info "Đang khởi động services..."
    
    # Load env variables
    load_env
    
    # Tạo thư mục logs nếu chưa có
    mkdir -p "$SERVER_DIR/logs"
    
    # Xác định interpreter
    BUN_PATH=$(which bun 2>/dev/null || echo "$HOME/.bun/bin/bun")
    if [ ! -f "$BUN_PATH" ]; then
        BUN_PATH="node"
    fi
    
    # Lấy giá trị từ env hoặc dùng mặc định
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${POSTGRES_PORT:-5433}
    DB_USER=${POSTGRES_USER:-postgres}
    DB_PASSWORD=${POSTGRES_PASSWORD:-postgres123}
    DB_NAME=${POSTGRES_DB:-jili_game}
    REDIS_HOST=${REDIS_HOST:-localhost}
    REDIS_PORT=${REDIS_PORT:-6379}
    REDIS_PASSWORD=${REDIS_PASSWORD:-redis123}
    MONGO_HOST=${MONGO_HOST:-localhost}
    MONGO_PORT=${MONGO_PORT:-27017}
    MONGO_USER=${MONGO_USER:-mongo}
    MONGO_PASSWORD=${MONGO_PASSWORD:-mongo123}
    MONGO_DB=${MONGO_DB:-jili_logs}
    JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
    JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-7d}
    
    # Export environment variables
    export NODE_ENV=production
    export DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME
    export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    export REDIS_HOST REDIS_PORT REDIS_PASSWORD
    export REDIS_URL="redis://:$REDIS_PASSWORD@$REDIS_HOST:$REDIS_PORT"
    export MONGO_HOST MONGO_PORT MONGO_USER MONGO_PASSWORD MONGO_DB
    export MONGO_URL="mongodb://$MONGO_USER:$MONGO_PASSWORD@$MONGO_HOST:$MONGO_PORT/$MONGO_DB?authSource=admin"
    export JWT_SECRET JWT_EXPIRES_IN
    
    # Start Game Server
    info "Khởi động Game Server..."
    cd "$GAMESERVER_DIR"
    export PORT=3000
    export WS_PORT=3001
    nohup $BUN_PATH dist/index.js > "$SERVER_DIR/logs/gameserver-out.log" 2> "$SERVER_DIR/logs/gameserver-error.log" &
    echo $! > "$SERVER_DIR/logs/gameserver.pid"
    success "Game Server đã được khởi động (PID: $(cat $SERVER_DIR/logs/gameserver.pid))"
    
    # Start API Server
    info "Khởi động API Server..."
    cd "$API_DIR"
    export PORT=3300
    nohup $BUN_PATH dist/server.js > "$SERVER_DIR/logs/api-out.log" 2> "$SERVER_DIR/logs/api-error.log" &
    echo $! > "$SERVER_DIR/logs/api.pid"
    success "API Server đã được khởi động (PID: $(cat $SERVER_DIR/logs/api.pid))"
    
    # Start CMS
    info "Khởi động CMS..."
    cd "$CMS_DIR/dist"
    if check_command serve; then
        nohup serve . -l 80 -s > "$SERVER_DIR/logs/cms-out.log" 2> "$SERVER_DIR/logs/cms-error.log" &
    else
        nohup npx serve . -l 80 -s > "$SERVER_DIR/logs/cms-out.log" 2> "$SERVER_DIR/logs/cms-error.log" &
    fi
    echo $! > "$SERVER_DIR/logs/cms.pid"
    success "CMS đã được khởi động (PID: $(cat $SERVER_DIR/logs/cms.pid))"
    
    success "Tất cả services đã được khởi động"
}

# Hàm stop services
stop_services() {
    info "Đang dừng services..."
    
    for service in gameserver api cms; do
        if [ -f "$SERVER_DIR/logs/$service.pid" ]; then
            PID=$(cat "$SERVER_DIR/logs/$service.pid")
            if kill -0 $PID 2>/dev/null; then
                kill $PID
                success "Đã dừng $service (PID: $PID)"
            fi
            rm -f "$SERVER_DIR/logs/$service.pid"
        fi
    done
}

# Hàm load env variables
load_env() {
    if [ -f "$SERVER_DIR/.env" ]; then
        set -a
        source "$SERVER_DIR/.env"
        set +a
    fi
}

# Hàm kiểm tra services
check_services() {
    info "Đang kiểm tra services..."
    echo ""
    
    # Docker services (chỉ databases)
    echo "=== Docker Services (Databases) ==="
    docker-compose ps postgres redis mongodb 2>/dev/null || docker compose ps postgres redis mongodb 2>/dev/null || echo "Không thể kiểm tra Docker services"
    echo ""
    
    # Application services
    echo "=== Application Services ==="
    for service in gameserver api cms; do
        if [ -f "$SERVER_DIR/logs/$service.pid" ]; then
            PID=$(cat "$SERVER_DIR/logs/$service.pid")
            if kill -0 $PID 2>/dev/null; then
                success "$service: Running (PID: $PID)"
            else
                warning "$service: Not running (stale PID file)"
            fi
        else
            warning "$service: No PID file found"
        fi
    done
    echo ""
    
    # Health checks
    echo "=== Health Checks ==="
    
    # Game Server
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        success "Game Server: ✓ Running (http://localhost:3000)"
    else
        warning "Game Server: ✗ Not responding (có thể đang khởi động...)"
    fi
    
    # API Server
    if curl -s http://localhost:3300/health > /dev/null 2>&1 || curl -s http://localhost:3300/api/health > /dev/null 2>&1; then
        success "API Server: ✓ Running (http://localhost:3300)"
    else
        warning "API Server: ✗ Not responding (có thể đang khởi động...)"
    fi
    
    # CMS Frontend
    if curl -s http://localhost:80 > /dev/null 2>&1; then
        success "CMS Frontend: ✓ Running (http://localhost:80)"
    else
        warning "CMS Frontend: ✗ Not responding (có thể đang khởi động...)"
    fi
}

# ===========================================
# MAIN EXECUTION
# ===========================================

main() {
    echo ""
    echo "============================================"
    echo "  JILI GAMES - AUTO SETUP & START"
    echo "============================================"
    echo ""
    
    # Kiểm tra quyền root (không bắt buộc nhưng khuyến nghị)
    if [ "$EUID" -ne 0 ]; then
        warning "Khuyến nghị chạy với quyền sudo để cài đặt packages"
    fi
    
    # Bước 1: Kiểm tra và cài đặt dependencies
    info "Bước 1: Kiểm tra dependencies..."
    check_docker
    
    if ! check_command bun; then
        install_bun
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    else
        success "Bun đã được cài đặt"
    fi
    
    echo ""
    
    # Bước 2: Tạo file .env
    info "Bước 2: Tạo file .env..."
    create_env
    load_env
    echo ""
    
    # Bước 3: Cài đặt dependencies cho các services
    info "Bước 3: Cài đặt dependencies..."
    install_dependencies "$GAMESERVER_DIR" "gameserver"
    install_dependencies "$API_DIR" "api"
    install_dependencies "$CMS_DIR" "cms"
    echo ""
    
    # Bước 4: Build các services
    info "Bước 4: Build services..."
    BUILD_FAILED=0
    
    if ! build_service "$GAMESERVER_DIR" "gameserver"; then
        BUILD_FAILED=1
    fi
    
    if ! build_service "$API_DIR" "api"; then
        BUILD_FAILED=1
    fi
    
    if ! build_service "$CMS_DIR" "cms"; then
        BUILD_FAILED=1
        warning "CMS build thất bại, nhưng sẽ tiếp tục..."
    fi
    
    if [ $BUILD_FAILED -eq 1 ]; then
        warning "Một số services build thất bại, nhưng sẽ tiếp tục setup..."
    fi
    echo ""
    
    # Bước 5: Start Docker services
    info "Bước 5: Khởi động Docker services..."
    start_docker
    echo ""
    
    # Đợi databases sẵn sàng
    info "Đang đợi databases sẵn sàng (30 giây)..."
    sleep 30
    echo ""
    
    # Bước 6: Cài đặt serve cho CMS
    info "Bước 6: Cài đặt serve cho CMS..."
    install_serve
    echo ""
    
    # Bước 7: Khởi động services
    info "Bước 7: Khởi động services..."
    stop_services 2>/dev/null || true
    start_services
    echo ""
    
    # Bước 8: Kiểm tra services
    info "Bước 8: Kiểm tra services..."
    sleep 5
    check_services
    echo ""
    
    # Hoàn thành
    echo "============================================"
    success "SETUP HOÀN TẤT!"
    echo "============================================"
    echo ""
    echo "Services đã được khởi động:"
    echo "  - Docker: PostgreSQL, Redis, MongoDB"
    echo "  - Direct: Game Server, API Server, CMS"
    echo ""
    echo "URLs:"
    echo "  - Game Server: http://localhost:3000"
    echo "  - API Server:  http://localhost:3300"
    echo "  - CMS:         http://localhost:80"
    echo ""
    echo "Các lệnh hữu ích:"
    echo "  - Xem logs:         tail -f $SERVER_DIR/logs/*.log"
    echo "  - Xem logs Docker:  cd server && docker-compose logs -f"
    echo "  - Stop services:    Dùng PID files trong $SERVER_DIR/logs/"
    echo "  - Stop Docker:      cd server && docker-compose down"
    echo ""
}

# Chạy main function
main

