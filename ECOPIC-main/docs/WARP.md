# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ReLeaf is a full-stack eco-action social app with a microservices architecture consisting of:
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS (port 5173)
- **Backend**: Node.js + Express + TypeScript API (port 3001)
- **Middleware**: Django REST API for AI points calculation (port 8000)
- **Database**: PostgreSQL with complex schema and stored procedures (port 5432)
- **Cache/Queue**: Redis for caching and job queues (port 6379)
- **Storage**: MinIO (S3-compatible) for image storage (ports 9000/9001)

## Development Commands

### Docker Development (Primary Method)
```bash
# Start all services
docker-compose up -d

# View logs for all services
docker-compose logs

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs middleware

# Rebuild and restart services
docker-compose down
docker-compose up --build

# Stop all services
docker-compose down
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev          # Development server with hot reload
npm run build        # Production build
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint checking
npm run preview      # Preview production build
```

### Backend (Node.js + Express)
```bash
cd backend
npm install
npm run dev          # Development with nodemon auto-reload
npm run build        # Compile TypeScript to JavaScript
npm run start        # Run compiled production version
npm test             # Run Jest tests
npm run lint         # ESLint checking
npm run typecheck    # TypeScript type checking
```

### Middleware (Django)
```bash
cd middleware
pip install -r requirements.txt
python setup_django.py          # Initial Django setup
python manage.py migrate        # Apply database migrations
python manage.py runserver 8000 # Start development server
```

### Database Operations
```bash
# Access PostgreSQL via Docker
docker exec -it releaf-postgres psql -U releaf_user -d releaf_db

# Load schema and sample data (if needed)
psql -U releaf_user -h localhost -d releaf_db -f database/schema.sql
psql -U releaf_user -h localhost -d releaf_db -f database/sample_data.sql
```

## Architecture Overview

### Service Communication Flow
1. **Frontend** → **Backend API** for all user interactions, authentication, and data
2. **Backend** → **Middleware** for AI-powered carbon credit points calculation
3. **Backend** → **PostgreSQL** for data persistence with complex transactions
4. **Backend** → **Redis** for caching user sessions and queuing background jobs
5. **Backend** → **MinIO** for image storage and retrieval

### Key Architectural Patterns

**Authentication**: JWT-based with access (15min) and refresh (30day) tokens stored in database
**Points Calculation**: Asynchronous flow where posts start as `PENDING_POINTS`, get processed by Django middleware, then become `PUBLISHED`
**Database Transactions**: Complex stored procedures for safe reward redemption with credit deduction
**State Management**: Frontend uses Zustand for client-side state management
**API Design**: RESTful with consistent error handling and rate limiting

### Database Schema Key Points
- UUIDs for all primary keys
- PostgreSQL arrays for post tags with GIN indexing
- Enum-like status fields with CHECK constraints
- Automatic `updated_at` triggers on all main tables
- Complex stored procedure `redeem_reward()` for atomic reward transactions
- Pre-populated rewards catalog with quantity tracking

### Critical Service Dependencies
- **Backend depends on**: PostgreSQL (health checks), Redis, Middleware service
- **Frontend depends on**: Backend API availability
- **Middleware**: Standalone Django service (can be developed independently)
- **Database**: Contains sample data and rewards catalog upon initialization

## Development Workflow

### Making Backend Changes
- API routes are currently placeholder stubs in `backend/src/server.ts`
- Real implementation should be in separate route files (`routes/auth.ts`, `routes/posts.ts`, etc.)
- Always run `npm run typecheck` and `npm run lint` before committing
- Use the existing middleware stack (helmet, cors, rate limiting)

### Making Frontend Changes
- Page components are in `frontend/src/pages/`
- Shared components in `frontend/src/components/`
- Follow existing routing structure in `App.tsx`
- Tailwind CSS is configured and ready for styling
- Always run `npm run typecheck` and `npm run lint` before committing

### Database Changes
- Update `database/schema.sql` for schema modifications
- Complex business logic should use PostgreSQL stored procedures (see `redeem_reward()` example)
- Use array types and GIN indexes for tag-based queries
- Always test database changes with sample data

### Adding New Features
1. Design API endpoints in backend (RESTful conventions)
2. Implement database changes in schema.sql
3. Create/update React components and pages
4. Update middleware points calculation logic if needed
5. Test the full flow: Frontend → Backend → Database → Middleware

## Service Health Checks
- Frontend: http://localhost:5173 (React app loads)
- Backend: http://localhost:3001/health
- Middleware: http://localhost:8000/api/health/
- MinIO Console: http://localhost:9001 (admin/minioadmin123)

## Testing Points Calculation
```bash
# Test middleware directly
curl -X POST http://localhost:8000/api/reward/ \
  -H "Content-Type: application/json" \
  -d '{"post_id":"test","user_id":"test","tags":["tree-planting"]}'
```

## Environment Configuration

### Required Environment Files
- `backend/.env` - Database URLs, JWT secrets, AWS credentials
- `frontend/.env` - API URL configuration
- `middleware/.env` - Django configuration

### Key Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection for caching
- `MIDDLEWARE_URL`: Django service URL for points calculation
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: Authentication keys
- `VITE_API_URL`: Frontend API endpoint configuration

## Common Issues & Debugging

**Docker services won't start**: Run `docker-compose down && docker-compose up --build`
**Database connection errors**: Verify PostgreSQL container is running and connection string is correct
**Points not calculating**: Check middleware service logs with `docker-compose logs middleware`
**Frontend API errors**: Verify CORS configuration and backend service availability