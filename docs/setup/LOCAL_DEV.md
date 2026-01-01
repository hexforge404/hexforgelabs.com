# Local Development Setup

This guide walks you through setting up the HexForge Portable Lab Assistant (PLA) development environment on your local machine.

## Prerequisites

Before starting, ensure you have the following installed:

### Required Software
- **Git** (v2.30+) - Version control
- **Node.js** (v18+) and npm - JavaScript runtime
- **Python** (v3.9+) - Backend services
- **Docker** (v20+) and Docker Compose - Containerization
- **Make** - Build automation (optional but recommended)

### Recommended Tools
- **VS Code** or your preferred IDE
- **Postman** or similar API testing tool
- **MongoDB Compass** - Database GUI (optional)

## Initial Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/hexforge404/hexforgelabs.com.git
cd hexforgelabs.com

# Checkout the appropriate branch
git checkout main
```

### 2. Install Dependencies

```bash
# Use the Makefile for quick setup
make setup

# Or manually install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
cd assistant && pip install -r requirements.txt && cd ..
```

### 3. Configure Environment Variables

```bash
# Copy example environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your local configuration
# Required variables:
# - DATABASE_URL
# - API_KEY
# - JWT_SECRET
# - STRIPE_KEY (if using payment features)
```

### 4. Start Local Services

#### Option A: Using Docker Compose (Recommended)

```bash
# Start all services in containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option B: Manual Start

```bash
# Terminal 1: Start MongoDB
docker run -d -p 27017:27017 --name mongo-dev mongo:latest

# Terminal 2: Start backend
cd backend
npm run dev

# Terminal 3: Start frontend
cd frontend
npm start

# Terminal 4: Start assistant service
cd assistant
python app.py
```

### 5. Verify Installation

```bash
# Check if services are running
curl http://localhost:3000  # Frontend
curl http://localhost:5000/api/health  # Backend
curl http://localhost:8000/health  # Assistant

# Or visit in your browser:
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Assistant: http://localhost:8000
```

## Development Workflow

### Daily Development

```bash
# 1. Start your development session
make dev  # or docker-compose up

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes
# ... code, code, code ...

# 4. Run linters and tests
make lint
make test

# 5. Generate diff report
make diff

# 6. Commit your changes
git add .
git commit -m "feat: your feature description"

# 7. Push and create PR
git push origin feature/your-feature-name
```

### Running Tests

```bash
# Run all tests
make test

# Run specific test suites
cd backend && npm test
cd frontend && npm test
cd assistant && pytest

# Run with coverage
make test-coverage
```

### Debugging

#### Backend Debugging
```bash
# Start backend in debug mode
cd backend
npm run debug

# Attach debugger to port 9229
```

#### Frontend Debugging
- Use Chrome DevTools (F12)
- React Developer Tools extension
- Enable source maps in webpack config

#### Assistant Debugging
```bash
# Start with Python debugger
cd assistant
python -m pdb app.py
```

## Common Issues

### Port Conflicts

If you encounter port conflicts:

```bash
# Check what's using the port
lsof -i :3000  # or :5000, :8000, etc.

# Kill the process
kill -9 <PID>

# Or change ports in .env files
```

### Database Connection Issues

```bash
# Reset MongoDB container
docker-compose down -v
docker-compose up -d mongo

# Check MongoDB logs
docker-compose logs mongo
```

### Node Modules Issues

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use the clean target
make clean
make setup
```

### Docker Issues

```bash
# Rebuild containers
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v

# Clean Docker system
docker system prune -a
```

## IDE Configuration

### VS Code

Recommended extensions:
- ESLint
- Prettier
- Python
- Docker
- GitLens

Recommended settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true
}
```

## Environment Variables Reference

### Backend (.env)
```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=mongodb://localhost:27017/hexforge
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
```

### Assistant (.env)
```bash
PYTHON_ENV=development
ASSISTANT_PORT=8000
OPENAI_API_KEY=sk-...
MODEL_NAME=gpt-4
```

## Next Steps

- Review the [Architecture Overview](../architecture/OVERVIEW.md)
- Check [Common Tasks](../runbooks/COMMON_TASKS.md) for development operations
- Read [Contributing Guidelines](../../CONTRIBUTING.md) before making changes

## Getting Help

- Check existing [documentation](../README.md)
- Review [Common Tasks runbook](../runbooks/COMMON_TASKS.md)
- Open an issue on GitHub
- Contact: rduff@hexforgelabs.com

---

**Last Updated:** 2026-01-01  
**Maintained By:** HexForge Labs Team
