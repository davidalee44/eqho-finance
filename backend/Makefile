.PHONY: help setup run validate validate-tui test test-setup diagnose export-customers view-customers clean

help:
	@echo "Eqho Backend & Validator - Available Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make setup          - Install dependencies with uv"
	@echo "  make setup-validator - Setup validator tools"
	@echo "  make test-setup     - Test if setup is correct"
	@echo ""
	@echo "Run:"
	@echo "  make run            - Start FastAPI backend"
	@echo "  make dev            - Start backend in development mode"
	@echo ""
	@echo "Validate:"
	@echo "  make validate       - Run quick CLI validator"
	@echo "  make validate-tui   - Run interactive TUI validator"
	@echo "  make diagnose       - Run data diagnostic script"
	@echo ""
	@echo "Utilities:"
	@echo "  make test           - Run backend tests"
	@echo "  make clean          - Clean up generated files"
	@echo ""

setup:
	@echo "📦 Installing backend dependencies with uv..."
	python3 -m venv .venv
	. .venv/bin/activate && uv pip install -r requirements.txt

setup-validator:
	@echo "🔧 Setting up validator..."
	./setup_validator.sh

run:
	@echo "🚀 Starting FastAPI backend..."
	. .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000

dev:
	@echo "🚀 Starting FastAPI backend (development mode)..."
	. .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

validate:
	@echo "🔍 Running quick validator..."
	@. .venv/bin/activate && python quick_validate.py

validate-tui:
	@echo "🔍 Starting interactive validator TUI..."
	@. .venv/bin/activate && python data_validator.py

test:
	@echo "🧪 Running tests..."
	@. .venv/bin/activate && pytest tests/ -v

test-setup:
	@echo "🔍 Testing validator setup..."
	@. .venv/bin/activate && python test_validation_setup.py

diagnose:
	@echo "🔬 Running data diagnostic..."
	@. .venv/bin/activate && python diagnose_data.py

export-customers:
	@echo "📊 Exporting customer MRR breakdown..."
	@. .venv/bin/activate && python export_customer_mrr.py

view-customers:
	@echo "🌐 Opening customer MRR viewer..."
	@open view_customer_mrr.html || xdg-open view_customer_mrr.html || echo "Open view_customer_mrr.html in your browser"

clean:
	@echo "🧹 Cleaning up..."
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	@echo "✓ Cleanup complete"

