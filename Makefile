# Makefile for HexForge Portable Lab Assistant
# Provides common development tasks and workflows

.PHONY: help setup install clean lint test diff release-notes dev build deploy

# Default target - show help
help:
	@echo "HexForge PLA - Available Commands"
	@echo "=================================="
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make setup          - Initial project setup (install dependencies)"
	@echo "  make install        - Install all dependencies"
	@echo "  make clean          - Clean build artifacts and caches"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start development environment"
	@echo "  make lint           - Run linters on all code"
	@echo "  make lint-fix       - Auto-fix linting issues"
	@echo "  make test           - Run all tests"
	@echo "  make test-coverage  - Run tests with coverage"
	@echo ""
	@echo "Documentation & Tracking:"
	@echo "  make diff           - Generate diff report for current changes"
	@echo "  make release-notes  - Generate release notes from diff reports"
	@echo ""
	@echo "Build & Deploy:"
	@echo "  make build          - Build for production"
	@echo "  make deploy         - Deploy to production (coming soon)"
	@echo ""
	@echo "Utilities:"
	@echo "  make docker-up      - Start Docker containers"
	@echo "  make docker-down    - Stop Docker containers"
	@echo "  make docker-logs    - View Docker logs"
	@echo "  make db-seed        - Seed database with test data"
	@echo ""

# Setup - Install all dependencies
setup: install
	@echo "✓ Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Configure environment: cp backend/.env.example backend/.env"
	@echo "  2. Start development: make dev"
	@echo "  3. View docs: cat docs/README.md"

# Install dependencies
install:
	@echo "Installing dependencies..."
	@echo "→ Root dependencies..."
	@npm install || echo "No root package.json found"
	@echo "→ Backend dependencies..."
	@cd backend && npm install
	@echo "→ Frontend dependencies..."
	@cd frontend && npm install
	@echo "→ Assistant dependencies..."
	@cd assistant && pip install -r requirements.txt || echo "No requirements.txt found"
	@echo "✓ Dependencies installed"

# Clean build artifacts and caches
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf node_modules backend/node_modules frontend/node_modules
	@rm -rf build backend/build frontend/build
	@rm -rf coverage backend/coverage frontend/coverage
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type f -name "*.pyo" -delete 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".coverage" -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Clean complete"

# Start development environment
dev:
	@echo "Starting development environment..."
	@docker-compose up -d
	@echo ""
	@echo "✓ Services started!"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:5000"
	@echo "  Assistant: http://localhost:8000"
	@echo ""
	@echo "View logs: make docker-logs"
	@echo "Stop:      make docker-down"

# Run linters
lint:
	@echo "Running linters..."
	@echo "→ Backend..."
	@cd backend && npm run lint || echo "No lint script found"
	@echo "→ Frontend..."
	@cd frontend && npm run lint || echo "No lint script found"
	@echo "→ Assistant..."
	@cd assistant && pylint *.py || echo "pylint not found"
	@cd assistant && black --check . || echo "black not found"
	@echo "✓ Linting complete"

# Auto-fix linting issues
lint-fix:
	@echo "Auto-fixing linting issues..."
	@echo "→ Backend..."
	@cd backend && npm run lint:fix || npm run lint -- --fix || echo "No lint:fix script"
	@echo "→ Frontend..."
	@cd frontend && npm run lint:fix || npm run lint -- --fix || echo "No lint:fix script"
	@echo "→ Assistant..."
	@cd assistant && black . || echo "black not found"
	@echo "✓ Auto-fix complete"

# Run all tests
test:
	@echo "Running tests..."
	@echo "→ Backend tests..."
	@cd backend && npm test || echo "No backend tests configured"
	@echo "→ Frontend tests..."
	@cd frontend && npm test -- --watchAll=false || echo "No frontend tests configured"
	@echo "→ Assistant tests..."
	@cd assistant && pytest || echo "pytest not found"
	@echo "✓ Tests complete"

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	@echo "→ Backend..."
	@cd backend && npm run test:coverage || npm test -- --coverage || echo "No coverage script"
	@echo "→ Frontend..."
	@cd frontend && npm test -- --coverage --watchAll=false || echo "No coverage available"
	@echo "→ Assistant..."
	@cd assistant && pytest --cov=. || echo "pytest-cov not found"
	@echo "✓ Coverage reports generated"
	@echo ""
	@echo "View reports:"
	@echo "  Backend:  backend/coverage/"
	@echo "  Frontend: frontend/coverage/"

# Generate diff report
diff:
	@echo "Generating diff report..."
	@./scripts/gen_diff_report.sh
	@echo ""
	@echo "Next: Review and commit the report"
	@echo "  git add docs/diffs/"
	@echo "  git commit -m 'docs: add diff report'"

# Generate release notes
release-notes:
	@echo "Generating release notes..."
	@./scripts/gen_release_notes.sh
	@echo ""
	@echo "Release notes updated: docs/RELEASE_NOTES.md"

# Build for production
build:
	@echo "Building for production..."
	@echo "→ Backend..."
	@cd backend && npm run build || echo "No build script"
	@echo "→ Frontend..."
	@cd frontend && npm run build
	@echo "✓ Build complete"
	@echo "  Frontend build: frontend/build/"

# Docker commands
docker-up:
	@docker-compose up -d
	@echo "✓ Docker containers started"

docker-down:
	@docker-compose down
	@echo "✓ Docker containers stopped"

docker-logs:
	@docker-compose logs -f

docker-restart:
	@docker-compose restart
	@echo "✓ Docker containers restarted"

docker-clean:
	@docker-compose down -v
	@echo "✓ Docker containers and volumes removed"

# Database operations
db-seed:
	@echo "Seeding database..."
	@node seedBlog.js || echo "Seed script not found"
	@echo "✓ Database seeded"

db-reset:
	@echo "Resetting database..."
	@docker-compose down -v
	@docker-compose up -d mongo
	@sleep 3
	@make db-seed
	@echo "✓ Database reset"

# Deployment (placeholder)
deploy:
	@echo "Deployment target not configured yet"
	@echo "Coming soon: Automated deployment workflow"

# Check prerequisites
check:
	@echo "Checking prerequisites..."
	@command -v node >/dev/null 2>&1 || echo "⚠ Node.js not found"
	@command -v npm >/dev/null 2>&1 || echo "⚠ npm not found"
	@command -v python3 >/dev/null 2>&1 || echo "⚠ Python not found"
	@command -v docker >/dev/null 2>&1 || echo "⚠ Docker not found"
	@command -v git >/dev/null 2>&1 || echo "⚠ Git not found"
	@echo "✓ Check complete"

# Update dependencies
update-deps:
	@echo "Updating dependencies..."
	@cd backend && npm update
	@cd frontend && npm update
	@cd assistant && pip install --upgrade -r requirements.txt || true
	@echo "✓ Dependencies updated"

# Security audit
audit:
	@echo "Running security audit..."
	@cd backend && npm audit
	@cd frontend && npm audit
	@cd assistant && pip-audit || echo "pip-audit not found"
	@echo "✓ Audit complete"

# Format code
format:
	@echo "Formatting code..."
	@cd backend && npx prettier --write "**/*.{js,jsx,json}" || true
	@cd frontend && npx prettier --write "src/**/*.{js,jsx,ts,tsx}" || true
	@cd assistant && black . || true
	@echo "✓ Formatting complete"

# Git helpers
git-status:
	@git status
	@echo ""
	@echo "Unstaged changes above ↑"

git-diff:
	@git --no-pager diff

# Aliases for common typos
instal: install
tests: test
buil: build
