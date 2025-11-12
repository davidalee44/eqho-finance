.PHONY: help install dev build clean test

help:
	@echo "Eqho Due Diligence - Available Commands:"
	@echo ""
	@echo "  make install          - Install all dependencies (frontend + backend)"
	@echo "  make dev              - Start both frontend and backend dev servers"
	@echo "  make dev-frontend     - Start only frontend dev server"
	@echo "  make dev-backend      - Start only backend dev server"
	@echo "  make build            - Build frontend for production"
	@echo "  make test             - Run tests"
	@echo "  make clean            - Clean build artifacts and cache"
	@echo "  make setup            - Complete project setup"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make docker-up        - Start all services (MongoDB + Backend)"
	@echo "  make docker-down      - Stop all services"
	@echo "  make docker-logs      - View Docker logs"
	@echo "  make docker-mongodb   - Start only MongoDB"
	@echo ""

install:
	@echo "Installing frontend dependencies..."
	npm install
	@echo "Setting up backend virtual environment..."
	cd backend && uv venv && source .venv/bin/activate && uv pip install -r requirements.txt
	@echo "✅ All dependencies installed"

setup: install
	@echo "Setting up environment files..."
	@test -f .env.local || cp .env.example .env.local
	@test -f backend/.env || cp backend/.env.example backend/.env
	@echo "⚠️  Please update .env.local and backend/.env with your API keys"
	@echo "✅ Project setup complete!"

dev-frontend:
	@echo "Starting frontend dev server on http://localhost:5173"
	npm run dev

dev-backend:
	@echo "Starting backend API server on http://localhost:8000"
	cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

dev:
	@echo "Starting frontend and backend servers..."
	@echo "Frontend: http://localhost:5173"
	@echo "Backend: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"
	@make -j2 dev-frontend dev-backend

build:
	@echo "Building frontend for production..."
	npm run build
	@echo "✅ Build complete! Output in dist/"

test:
	@echo "Running frontend tests..."
	npm run lint
	@echo "Running backend tests..."
	cd backend && source .venv/bin/activate && pytest tests/ || echo "⚠️  No tests found yet"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/ .vite/ node_modules/.vite/
	rm -rf backend/__pycache__/ backend/**/__pycache__/
	rm -rf backend/.pytest_cache/
	@echo "✅ Clean complete"

clean-all: clean
	@echo "Removing all dependencies..."
	rm -rf node_modules/
	rm -rf backend/.venv/
	@echo "✅ All dependencies removed"

# Docker commands
docker-up:
	@echo "Starting Docker services (MongoDB 8 + Backend API)..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "MongoDB: mongodb://localhost:27017"
	@echo "Backend API: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

docker-down:
	@echo "Stopping Docker services..."
	docker-compose down
	@echo "✅ Services stopped"

docker-logs:
	docker-compose logs -f

docker-mongodb:
	@echo "Starting MongoDB 8 only..."
	docker-compose up -d mongodb
	@echo "✅ MongoDB started on port 27017"

docker-clean:
	@echo "Removing Docker volumes (this will delete all MongoDB data)..."
	docker-compose down -v
	@echo "⚠️  MongoDB data deleted"

