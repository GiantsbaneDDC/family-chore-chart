#!/bin/bash
#
# 🏠 Family Chore Chart - Easy Install Script
# 
# This script will:
# 1. Check prerequisites (Node.js, PostgreSQL)
# 2. Install dependencies
# 3. Set up the database
# 4. Configure environment
# 5. Build the app
# 6. Optionally set up as a system service
#
# Usage: curl -fsSL https://raw.githubusercontent.com/GiantsbaneDDC/family-chore-chart/master/scripts/install.sh | bash
#    or: ./scripts/install.sh
#

set -e

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji support
CHECK="✅"
CROSS="❌"
WARN="⚠️"
ROCKET="🚀"
HOUSE="🏠"
GEAR="⚙️"
DB="🗄️"
KEY="🔑"

print_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${HOUSE} ${MAGENTA}Family Chore Chart${NC} - Easy Installer                    ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}${CHECK}${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}${WARN}${NC}  $1"
}

log_error() {
    echo -e "${RED}${CROSS}${NC} $1"
}

log_step() {
    echo ""
    echo -e "${MAGENTA}${GEAR}${NC} ${CYAN}$1${NC}"
    echo -e "${CYAN}────────────────────────────────────────${NC}"
}

# Generate random password
generate_password() {
    openssl rand -base64 24 | tr -d '/+=' | head -c 24
}

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command_exists apt; then
            echo "debian"
        elif command_exists dnf; then
            echo "fedora"
        elif command_exists yum; then
            echo "rhel"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites"
    
    local missing=()
    
    # Check Node.js
    if command_exists node; then
        local node_version=$(node -v | sed 's/v//' | cut -d. -f1)
        if [ "$node_version" -ge 18 ]; then
            log_success "Node.js $(node -v)"
        else
            log_warn "Node.js $(node -v) found, but 18+ recommended"
        fi
    else
        log_error "Node.js not found"
        missing+=("nodejs")
    fi
    
    # Check npm
    if command_exists npm; then
        log_success "npm $(npm -v)"
    else
        log_error "npm not found"
        missing+=("npm")
    fi
    
    # Check PostgreSQL
    if command_exists psql; then
        log_success "PostgreSQL $(psql --version | head -1)"
    else
        log_error "PostgreSQL not found"
        missing+=("postgresql")
    fi
    
    # Check if PostgreSQL is running
    if command_exists pg_isready; then
        if pg_isready -q 2>/dev/null; then
            log_success "PostgreSQL is running"
        else
            log_warn "PostgreSQL is installed but not running"
        fi
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo ""
        log_warn "Missing prerequisites: ${missing[*]}"
        
        local os=$(detect_os)
        echo ""
        echo "Install them with:"
        echo ""
        
        case $os in
            debian)
                echo "  sudo apt update"
                echo "  sudo apt install -y nodejs npm postgresql postgresql-contrib"
                ;;
            fedora)
                echo "  sudo dnf install -y nodejs npm postgresql-server postgresql-contrib"
                echo "  sudo postgresql-setup --initdb"
                echo "  sudo systemctl start postgresql"
                ;;
            macos)
                echo "  brew install node postgresql@16"
                echo "  brew services start postgresql@16"
                ;;
            *)
                echo "  Please install Node.js 18+, npm, and PostgreSQL manually"
                ;;
        esac
        echo ""
        
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Get install directory
get_install_dir() {
    log_step "Installation directory"
    
    local default_dir="$HOME/chore-chart"
    
    # Check if we're already in the repo
    if [ -f "package.json" ] && grep -q "family-chore-chart" package.json 2>/dev/null; then
        INSTALL_DIR="$(pwd)"
        log_info "Using current directory: $INSTALL_DIR"
        return
    fi
    
    read -p "Install directory [$default_dir]: " input_dir
    INSTALL_DIR="${input_dir:-$default_dir}"
    
    if [ -d "$INSTALL_DIR" ]; then
        log_info "Directory exists, will update"
    else
        log_info "Will create: $INSTALL_DIR"
    fi
}

# Clone or update repository
setup_repo() {
    log_step "Setting up repository"
    
    if [ -d "$INSTALL_DIR/.git" ]; then
        log_info "Updating existing repository..."
        cd "$INSTALL_DIR"
        git pull
        log_success "Repository updated"
    else
        log_info "Cloning repository..."
        git clone https://github.com/GiantsbaneDDC/family-chore-chart.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
        log_success "Repository cloned"
    fi
}

# Install dependencies
install_dependencies() {
    log_step "Installing dependencies"
    
    log_info "Installing frontend dependencies..."
    npm install
    log_success "Frontend dependencies installed"
    
    log_info "Installing backend dependencies..."
    cd server
    npm install
    cd ..
    log_success "Backend dependencies installed"
}

# Setup database
setup_database() {
    log_step "Database setup"
    
    # Default values
    local db_name="chorechart"
    local db_user="chorechart"
    local db_pass=$(generate_password)
    local db_host="localhost"
    local db_port="5432"
    
    echo ""
    echo "Database configuration:"
    echo "(Press Enter to accept defaults)"
    echo ""
    
    read -p "  Database name [$db_name]: " input
    db_name="${input:-$db_name}"
    
    read -p "  Database user [$db_user]: " input
    db_user="${input:-$db_user}"
    
    read -p "  Database password [auto-generated]: " input
    db_pass="${input:-$db_pass}"
    
    read -p "  Database host [$db_host]: " input
    db_host="${input:-$db_host}"
    
    read -p "  Database port [$db_port]: " input
    db_port="${input:-$db_port}"
    
    # Store for later
    DB_NAME="$db_name"
    DB_USER="$db_user"
    DB_PASS="$db_pass"
    DB_HOST="$db_host"
    DB_PORT="$db_port"
    
    echo ""
    
    # Try to create database and user
    if command_exists sudo && command_exists -u postgres psql 2>/dev/null || sudo -u postgres psql -c '\q' 2>/dev/null; then
        log_info "Creating PostgreSQL user and database..."
        
        # Create user if not exists
        sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$db_user'" | grep -q 1 || \
            sudo -u postgres psql -c "CREATE USER $db_user WITH PASSWORD '$db_pass';"
        
        # Create database if not exists
        sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$db_name'" | grep -q 1 || \
            sudo -u postgres psql -c "CREATE DATABASE $db_name OWNER $db_user;"
        
        # Grant privileges
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $db_name TO $db_user;"
        
        log_success "Database '$db_name' ready"
    else
        log_warn "Could not auto-create database. Please create it manually:"
        echo ""
        echo "  sudo -u postgres psql"
        echo "  CREATE USER $db_user WITH PASSWORD '$db_pass';"
        echo "  CREATE DATABASE $db_name OWNER $db_user;"
        echo "  GRANT ALL PRIVILEGES ON DATABASE $db_name TO $db_user;"
        echo "  \\q"
        echo ""
        read -p "Press Enter when database is ready..."
    fi
}

# Configure environment
configure_env() {
    log_step "Configuring environment"
    
    local session_secret=$(generate_password)
    local env_file="$INSTALL_DIR/server/.env"
    
    cat > "$env_file" << EOF
# Server Configuration
PORT=8080
SESSION_SECRET=$session_secret

# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS

# Prisma Database URL
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"
EOF
    
    log_success "Environment configured: $env_file"
    
    # Show the password for user to save
    echo ""
    echo -e "  ${KEY} ${YELLOW}Database password: $DB_PASS${NC}"
    echo -e "  ${KEY} ${YELLOW}Session secret: $session_secret${NC}"
    echo ""
    echo -e "  ${WARN}  Save these somewhere safe!"
    echo ""
}

# Initialize database schema
init_database() {
    log_step "Initializing database schema"
    
    cd "$INSTALL_DIR/server"
    
    log_info "Pushing schema to database..."
    npm run db:push
    log_success "Schema created"
    
    log_info "Seeding default data..."
    npm run db:seed
    log_success "Default data seeded"
    
    cd "$INSTALL_DIR"
}

# Build frontend
build_frontend() {
    log_step "Building frontend"
    
    cd "$INSTALL_DIR"
    npm run build
    log_success "Frontend built"
}

# Setup systemd service (optional)
setup_service() {
    log_step "System service setup"
    
    read -p "Set up as a system service (auto-start on boot)? (y/N) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Skipping service setup"
        return
    fi
    
    local service_file="/etc/systemd/system/chorechart.service"
    local node_path=$(which node)
    local user=$(whoami)
    
    sudo tee "$service_file" > /dev/null << EOF
[Unit]
Description=Family Chore Chart
After=network.target postgresql.service

[Service]
Type=simple
User=$user
WorkingDirectory=$INSTALL_DIR/server
ExecStart=$node_path index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable chorechart
    sudo systemctl start chorechart
    
    log_success "Service installed and started"
    log_info "Manage with: sudo systemctl {start|stop|restart|status} chorechart"
}

# Print completion message
print_complete() {
    local port="${PORT:-8080}"
    local ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ${ROCKET} ${GREEN}Installation Complete!${NC}                                 ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${HOUSE} Your Family Chore Chart is ready!"
    echo ""
    echo -e "  ${CYAN}Access the app:${NC}"
    echo -e "     Local:   ${YELLOW}http://localhost:$port${NC}"
    echo -e "     Network: ${YELLOW}http://$ip:$port${NC}"
    echo ""
    echo -e "  ${CYAN}Default admin PIN:${NC} ${YELLOW}1234${NC} (change this in settings!)"
    echo ""
    echo -e "  ${CYAN}Start manually:${NC}"
    echo -e "     cd $INSTALL_DIR/server && npm start"
    echo ""
    echo -e "  ${CYAN}View logs:${NC}"
    echo -e "     journalctl -u chorechart -f"
    echo ""
    echo -e "  ${CYAN}Documentation:${NC}"
    echo -e "     ${BLUE}https://github.com/GiantsbaneDDC/family-chore-chart${NC}"
    echo ""
}

# Main installation flow
main() {
    print_banner
    
    check_prerequisites
    get_install_dir
    setup_repo
    install_dependencies
    setup_database
    configure_env
    init_database
    build_frontend
    setup_service
    
    print_complete
}

# Run it
main "$@"
