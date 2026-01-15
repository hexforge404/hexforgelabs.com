# Common Tasks Runbook

This runbook contains step-by-step instructions for common development and operational tasks for the HexForge Portable Lab Assistant (PLA) project.

## 🚀 Development Tasks

### Starting Development Environment

#### Quick Start (Recommended)
```bash
# Start all services with Docker Compose
make dev
# or
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Manual Start (Individual Services)
```bash
# Terminal 1: Start MongoDB
docker run -d -p 27017:27017 --name mongo-dev mongo:latest

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm start

# Terminal 4: Assistant
cd assistant && python app.py
```

### Stopping Services

```bash
# Stop Docker Compose services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Stop individual service
docker stop <container-name>
```

## 🧪 Testing

### Running All Tests

```bash
# Run complete test suite
make test

# Run with coverage report
make test-coverage
```

### Component-Specific Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Assistant tests
cd assistant
pytest

# Run specific test file
npm test -- path/to/test-file.test.js
pytest tests/test_specific.py
```

### Integration Tests

```bash
# Run integration tests
cd backend
npm run test:integration

# With Docker environment
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### E2E Tests

```bash
# Run end-to-end tests
cd frontend
npm run test:e2e

# Run in headless mode
npm run test:e2e:headless
```

## 🔍 Linting & Code Quality

### Running Linters

```bash
# Run all linters
make lint

# Backend linting
cd backend && npm run lint

# Frontend linting
cd frontend && npm run lint

# Python linting
cd assistant && pylint app.py
cd assistant && black --check .
```

### Auto-fixing Issues

```bash
# Auto-fix linting issues
cd backend && npm run lint:fix
cd frontend && npm run lint:fix

# Format Python code
cd assistant && black .
```

### Type Checking

```bash
# TypeScript type checking
cd frontend && npm run type-check

# Python type checking
cd assistant && mypy .
```

## 📝 Diff Reports & Documentation

### Generating Diff Reports

```bash
# Generate diff report for current changes
make diff
# or
./scripts/gen_diff_report.sh

# Generate diff report for specific commit range
./scripts/gen_diff_report.sh <start-commit> <end-commit>

# View latest diff report
ls -la docs/diffs/
```

### Generating Release Notes

```bash
# Aggregate diff reports into release notes
make release-notes
# or
./scripts/gen_release_notes.sh

# View release notes
cat docs/RELEASE_NOTES.md
```

### Updating Documentation

```bash
# Update docs after code changes
# 1. Edit relevant .md files in docs/
# 2. Commit with message: "docs: update <topic>"

# Generate API documentation (if applicable)
cd backend && npm run docs
cd frontend && npm run docs
```

## 🗄️ Database Operations

### MongoDB Management

```bash
# Connect to MongoDB shell
docker exec -it hexforgelabs-mongo mongosh

# Or use connection string
mongosh mongodb://localhost:27017/hexforge
```

### Database Backup

```bash
# Backup database
docker exec hexforgelabs-mongo mongodump --out=/backup --db=hexforge

# Copy backup to host
docker cp hexforgelabs-mongo:/backup ./backups/$(date +%Y%m%d)
```

### Database Restore

```bash
# Restore from backup
docker exec hexforgelabs-mongo mongorestore --db=hexforge /backup/hexforge

# Or from host
docker cp ./backups/20260101 hexforgelabs-mongo:/restore
docker exec hexforgelabs-mongo mongorestore --db=hexforge /restore/hexforge
```

### Seeding Data

```bash
# Seed initial data
node seedBlog.js

# Reset and seed
npm run db:reset
npm run db:seed
```

### Database Migrations

```bash
# Run migrations
cd backend && npm run migrate

# Rollback migration
cd backend && npm run migrate:rollback

# Create new migration
cd backend && npm run migrate:create <migration-name>
```

## 🐛 Debugging

### Backend Debugging

```bash
# Start backend in debug mode
cd backend
npm run debug

# Attach debugger on port 9229
# In VS Code: Run > Attach to Process
```

### Frontend Debugging

```bash
# Enable React DevTools
# Install browser extension: React Developer Tools

# View detailed logs
REACT_APP_LOG_LEVEL=debug npm start
```

### Viewing Logs

```bash
# Docker Compose logs
docker-compose logs -f [service-name]

# Specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f assistant

# Application logs
tail -f backend/logs/app.log
tail -f assistant/logs/assistant.log
```

### Troubleshooting Network Issues

```bash
# Check running services
docker-compose ps

# Check service health
curl http://localhost:5000/api/health
curl http://localhost:8000/health

# Inspect network
docker network inspect hexforgelabs_default

# Test database connection
docker exec hexforgelabs-mongo mongosh --eval "db.adminCommand('ping')"
```

## 🔐 Security Tasks

### Checking for Vulnerabilities

```bash
# Check npm dependencies
cd backend && npm audit
cd frontend && npm audit

# Check Python dependencies
cd assistant && pip-audit

# Fix vulnerabilities
npm audit fix
npm audit fix --force  # Caution: may introduce breaking changes
```

### Updating Dependencies

```bash
# Update npm dependencies
cd backend && npm update
cd frontend && npm update

# Update Python dependencies
cd assistant && pip install --upgrade -r requirements.txt

# Check outdated packages
npm outdated
pip list --outdated
```

### Rotating Secrets

```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env files
# backend/.env: JWT_SECRET=<new-secret>

# Restart services
docker-compose restart backend
```

## 🚢 Deployment

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build

# Build Docker images
docker-compose -f docker-compose.prod.yml build
```

### Running Production Build Locally

```bash
# Start production containers
docker-compose -f docker-compose.prod.yml up -d

# Check services
docker-compose -f docker-compose.prod.yml ps
```

### Pushing Docker Images

```bash
# Tag images
docker tag hexforgelabs-backend:latest hexforge404/hexforgelabs-backend:v1.0.0
docker tag hexforgelabs-frontend:latest hexforge404/hexforgelabs-frontend:v1.0.0

# Push to registry
docker push hexforge404/hexforgelabs-backend:v1.0.0
docker push hexforge404/hexforgelabs-frontend:v1.0.0
```

## 🔄 Git Operations

### Creating a Feature Branch

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Push branch
git push -u origin feature/your-feature-name
```

### Commit Conventions

```bash
# Commit with conventional commit format
git commit -m "feat: add user profile page"
git commit -m "fix: resolve login issue"
git commit -m "docs: update API documentation"
git commit -m "chore: update dependencies"

# See CONTRIBUTING.md for full list
```

### Rebasing and Updating Branch

```bash
# Update your branch with latest main
git checkout main
git pull origin main
git checkout feature/your-feature-name
git rebase main

# Resolve conflicts if any, then
git rebase --continue
```

### Creating a Pull Request

```bash
# 1. Push your branch
git push origin feature/your-feature-name

# 2. Generate diff report
make diff

# 3. Commit the diff report
git add docs/diffs/
git commit -m "docs: add diff report for feature"
git push

# 4. Create PR on GitHub
# Include: description, checklist, diff report link
```

## 📊 Monitoring & Performance

### Checking Service Health

```bash
# Health check endpoints
curl http://localhost:5000/api/health
curl http://localhost:8000/health

# Check resource usage
docker stats

# Check specific container
docker stats hexforgelabs-backend
```

### Performance Testing

```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 http://localhost:5000/api/products

# Or use Artillery
npm install -g artillery
artillery quick --count 10 --num 100 http://localhost:5000/api/products
```

### Analyzing Logs

```bash
# Search logs for errors
docker-compose logs | grep ERROR

# Count requests per endpoint
docker-compose logs backend | grep "GET /api" | cut -d' ' -f6 | sort | uniq -c

# Monitor real-time
watch -n 1 'docker-compose logs --tail=20 backend'
```

## 🧹 Cleanup Tasks

### Cleaning Docker Resources

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Clean everything (caution!)
docker system prune -a --volumes
```

### Cleaning Dependencies

```bash
# Remove node_modules
find . -name "node_modules" -type d -exec rm -rf {} +

# Remove Python cache
find . -name "__pycache__" -type d -exec rm -rf {} +
find . -name "*.pyc" -delete

# Or use make
make clean
```

### Resetting Development Environment

```bash
# Complete reset
docker-compose down -v
rm -rf node_modules backend/node_modules frontend/node_modules
make setup
make dev
```

## ❓ Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # or :5000, :8000

# Kill process
kill -9 <PID>
```

### Docker Issues

```bash
# Restart Docker daemon
sudo systemctl restart docker

# Reset Docker
docker system prune -a
docker volume prune
```

### Permission Issues

```bash
# Fix file permissions
chmod +x scripts/*.sh

# Fix ownership
sudo chown -R $USER:$USER .
```

## 📞 Getting Help

If you encounter issues not covered here:

1. Check [Local Development Setup](../setup/LOCAL_DEV.md)
2. Review [Architecture Overview](../architecture/OVERVIEW.md)
3. Search existing GitHub issues
4. Ask in team chat
5. Create a new issue with details
6. Contact: rduff@hexforgelabs.com

---

**Last Updated:** 2026-01-01  
**Maintained By:** HexForge Labs Team
