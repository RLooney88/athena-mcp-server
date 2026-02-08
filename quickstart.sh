#!/bin/bash
#
# Athena MCP Server - Quick Start Script
#
# This script helps you quickly set up and run the Athena MCP Server
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version must be 18 or higher. Current version: $(node --version)"
        exit 1
    fi
    
    log_info "Node.js version: $(node --version)"
}

# Install dependencies
install_deps() {
    log_info "Installing dependencies..."
    npm ci
    log_info "Dependencies installed successfully"
}

# Build TypeScript
build() {
    log_info "Building TypeScript..."
    npm run build
    log_info "Build completed successfully"
}

# Run tests
run_tests() {
    log_info "Running validation tests..."
    npm run test:mock
}

# Start server
start_server() {
    log_info "Starting Athena MCP Server..."
    log_info "Press Ctrl+C to stop"
    echo ""
    npm run dev
}

# Setup environment
setup_env() {
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_info "Creating .env file from .env.example..."
            cp .env.example .env
            log_warn "Please edit .env and configure your Athena API credentials"
        else
            log_error ".env.example not found"
            exit 1
        fi
    fi
}

# Show help
show_help() {
    echo "Athena MCP Server - Quick Start"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  install    Install dependencies"
    echo "  build      Build TypeScript"
    echo "  test       Run validation tests"
    echo "  start      Start development server"
    echo "  setup      Setup environment file"
    echo "  all        Run install, build, test, and start"
    echo "  help       Show this help message"
    echo ""
}

# Main
case "${1:-help}" in
    install)
        check_node
        install_deps
        ;;
    build)
        check_node
        build
        ;;
    test)
        check_node
        run_tests
        ;;
    start)
        check_node
        setup_env
        start_server
        ;;
    setup)
        setup_env
        ;;
    all)
        check_node
        install_deps
        build
        run_tests
        log_info "All steps completed successfully!"
        log_info "Run '$0 start' to start the server"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
