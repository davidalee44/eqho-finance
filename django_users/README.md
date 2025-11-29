# Eqho User Management Service

Django-based user tracking and management service for the Eqho Due Diligence platform.

## Features

- **Custom User Model** with UUID primary keys and Supabase integration
- **Role-based Access Control** (Admin, Investor, Analyst, Viewer)
- **Activity Tracking** for audit logs
- **Invitation System** for user onboarding
- **REST API** with JWT authentication
- **Admin Dashboard** for user management

## Quick Start

```bash
# Activate virtual environment
source .venv/bin/activate

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver 8002
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/users/` | GET | List users (admin) |
| `/api/v1/users/me/` | GET | Current user profile |
| `/api/v1/users/me/` | PATCH | Update profile |
| `/api/v1/users/{id}/` | GET | User details |
| `/api/v1/users/{id}/activity/` | GET | User activity (admin) |
| `/api/v1/activities/` | GET | All activities (admin) |
| `/api/v1/invitations/` | GET/POST | Manage invitations |
| `/api/health/` | GET | Health check |

## User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access, user management |
| `investor` | View all data, export reports |
| `analyst` | View data, limited export |
| `viewer` | View only |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `SECRET_KEY` - Django secret key
- `DB_*` - Database configuration
- `CORS_ALLOWED_ORIGINS` - Frontend URLs

## Database

Development uses SQLite. For production, configure PostgreSQL:

```bash
DB_ENGINE=django.db.backends.postgresql
DB_NAME=eqho_users
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=db.supabase.co
DB_PORT=5432
```

## Integration with Main App

This service provides user management for the Eqho platform. Integration points:

1. **Supabase Auth**: Users sync via `supabase_id` field
2. **Feature Flags**: Per-user overrides in `feature_overrides` JSON field
3. **Activity Tracking**: Log actions from main app via API

## Development

```bash
# Install dependencies
uv pip install -r requirements.txt

# Run tests
python manage.py test

# Check for issues
python manage.py check
```

## Project Structure

```
django_users/
├── manage.py
├── requirements.txt
├── user_management/     # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── users/               # Users app
    ├── models.py        # User, Activity, Invitation
    ├── views.py         # API ViewSets
    ├── serializers.py   # DRF serializers
    ├── admin.py         # Admin configuration
    └── urls.py          # URL routing
```

