# ReLeaf 🌿

> Semi-social eco-action app where users post photos of eco-actions, earn carbon-credit points, and redeem rewards.

## Overview

ReLeaf is a full-stack application that encourages environmental action through a social platform where users can:
- Share photos of their eco-friendly activities
- Earn carbon credit points automatically calculated by AI
- Browse community actions with tag filtering
- Redeem points for eco-friendly rewards

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite, Tailwind CSS, React Router, Zustand
- **Backend**: Node.js + Express + TypeScript, JWT auth, PostgreSQL
- **Middleware**: Django REST API for points calculation
- **Database**: PostgreSQL with Redis for caching
- **Storage**: S3-compatible object storage (MinIO for development)

### Services
1. **Frontend** (React): User interface running on port 5173
2. **Backend** (Node.js): REST API on port 3001
3. **Middleware** (Django): Points calculation service on port 8000
4. **Database** (PostgreSQL): Data persistence on port 5432
5. **Redis**: Caching and queues on port 6379
6. **MinIO**: Object storage on ports 9000/9001

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for middleware development)

### Option 1: Docker Development (Recommended)

1. **Clone and navigate to the project**
   ```bash
   git clone <repository-url>
   cd releaf-app
   ```

2. **Start all services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the applications**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Middleware: http://localhost:8000
   - MinIO Console: http://localhost:9001 (admin/minioadmin123)

### Option 2: Local Development

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### Middleware Setup
```bash
cd middleware
pip install -r requirements.txt
python setup_django.py
python manage.py migrate
python manage.py runserver 8000
```

#### Database Setup
```bash
# Using Docker for PostgreSQL
docker run -d --name releaf-postgres \
  -e POSTGRES_DB=releaf_db \
  -e POSTGRES_USER=releaf_user \
  -e POSTGRES_PASSWORD=releaf_password \
  -p 5432:5432 postgres:15-alpine

# Run schema and sample data
psql -U releaf_user -h localhost -d releaf_db -f database/schema.sql
psql -U releaf_user -h localhost -d releaf_db -f database/sample_data.sql
```

## Project Structure

```
releaf-app/
├── frontend/           # React application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Route components
│   │   ├── api/        # API layer
│   │   └── store/      # State management
│   ├── package.json
│   └── Dockerfile
├── backend/            # Node.js API server
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── middleware/ # Express middleware
│   │   ├── models/     # Database models
│   │   └── utils/      # Helper functions
│   ├── package.json
│   └── Dockerfile
├── middleware/         # Django points service
│   ├── releaf_middleware/
│   ├── points/         # Points calculation app
│   ├── requirements.txt
│   └── Dockerfile
├── database/           # Database schemas and migrations
│   ├── schema.sql      # PostgreSQL schema
│   └── sample_data.sql # Test data
├── docs/              # Additional documentation
└── docker-compose.yml # Development environment
```

## API Endpoints

### Backend (Node.js) - Port 3001
```
POST   /api/auth/register    # User registration
POST   /api/auth/login       # User login
POST   /api/auth/refresh     # Refresh JWT token
POST   /api/auth/logout      # Logout user

GET    /api/users/:id        # Get user profile
PUT    /api/users/:id        # Update user profile

POST   /api/posts            # Create new post
GET    /api/posts            # List posts (with filtering)
GET    /api/posts/:id        # Get single post
PUT    /api/posts/:id        # Update post
DELETE /api/posts/:id        # Delete post

GET    /api/rewards          # List available rewards
POST   /api/redeem           # Redeem reward

GET    /health               # Health check
```

### Middleware (Django) - Port 8000
```
POST   /api/reward/          # Calculate points for post
GET    /api/health/          # Health check
```

## Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://releaf_user:password@localhost:5432/releaf_db
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=http://localhost:5173
MIDDLEWARE_URL=http://localhost:8000
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=releaf-images
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
```

### Middleware (.env)
```env
DEBUG=True
SECRET_KEY=your-django-secret-key
```

## Development Workflow

### 1. Making Changes
- Frontend: Edit files in `frontend/src/`, hot reload active
- Backend: Edit files in `backend/src/`, nodemon restarts server
- Middleware: Edit files in `middleware/`, Django auto-reloads

### 2. Database Changes
- Update `database/schema.sql` for schema changes
- Add migration scripts as needed
- Restart postgres container to apply changes

### 3. Adding New Features
1. Update API endpoints in backend
2. Create/update React components
3. Update points calculation logic in middleware
4. Add database migrations if needed
5. Update tests

## Key Features Implementation

### Authentication Flow
1. User registers/logs in → Backend issues access + refresh tokens
2. Access token (15min) for API calls
3. Refresh token (30days) for renewing access
4. Tokens stored securely (httpOnly cookies recommended)

### Post Creation Flow
1. User uploads image + metadata
2. Backend stores post with status `PENDING_POINTS`
3. Backend calls middleware to calculate points
4. Middleware returns points (100-400 random for now)
5. Backend updates post status to `PUBLISHED`
6. User's carbon credits increased

### Reward Redemption
1. User selects reward from catalog
2. Backend verifies user has sufficient credits
3. Database transaction: deduct credits + record redemption
4. Reward quantity decremented (if limited)

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### API Testing
Use the provided Postman collection or curl commands:
```bash
# Health checks
curl http://localhost:3001/health
curl http://localhost:8000/api/health/

# Test middleware points calculation
curl -X POST http://localhost:8000/api/reward/ \
  -H "Content-Type: application/json" \
  -d '{"post_id":"test","user_id":"test","tags":["tree-planting"]}'
```

## Deployment

### Production Considerations
- Use managed PostgreSQL (AWS RDS, etc.)
- Use Redis cluster for high availability
- Use real S3 for object storage
- Set up proper CI/CD pipeline
- Configure monitoring and logging
- Use HTTPS everywhere
- Set proper CORS policies

### Environment Setup
- Use Docker Compose for staging
- Use Kubernetes for production scaling
- Set up load balancers
- Configure SSL certificates
- Set up monitoring (DataDog, New Relic, etc.)

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Troubleshooting

### Common Issues

**Docker services won't start:**
```bash
docker-compose down
docker-compose up --build
```

**Database connection errors:**
- Check PostgreSQL is running: `docker ps | grep postgres`
- Verify connection string in backend .env
- Check database exists: `docker exec -it releaf-postgres psql -U releaf_user -l`

**Frontend not loading:**
- Check if backend is running on port 3001
- Verify VITE_API_URL in frontend environment
- Check browser console for errors

**Points not calculating:**
- Check middleware is running on port 8000
- Verify backend can reach middleware
- Check Django logs: `docker logs releaf-middleware`

### Logs
```bash
# View all service logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs middleware
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support:
- Create an issue on GitHub
- Check the docs/ folder for detailed documentation
- Review the API documentation in Postman collection