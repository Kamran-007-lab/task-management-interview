# Task Management System

A simple task management API built with Node.js, Express, and PostgreSQL.

## Features

- User authentication with JWT tokens
- Create, read, update, and delete tasks
- Task completion tracking
- Email notifications (via background jobs)
- Redis caching for performance
- RESTful API design

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- SMTP email service (Gmail recommended)

**Note:** PostgreSQL and Redis will run in Docker containers only. Do not install them locally.

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd task-management-system
```

2. Set up environment variables
```bash
cp env.example .env
```

Edit the `.env` file with your configuration:
```env
PORT=3000
NODE_ENV=development

# Database (Docker service - DO NOT change these values)
DB_NAME=task_management
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432

# JWT
JWT_SECRET=your-secret-key

# Redis (Docker service - DO NOT change these values)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

3. Start the database and Redis services
```bash
docker-compose up -d
```
*Note: The PostgreSQL container will automatically create the `task_management` database*

4. Install dependencies
```bash
npm install
```

5. Verify Docker services are running
```bash
docker-compose ps
```
You should see both `postgres` and `redis` services running.

6. Start the server
```bash
npm run dev
```

7. Verify the application is running
```bash
curl http://localhost:3000/health
```
You should get a response like: `{"status":"OK","timestamp":"..."}`

## ⚠️ Important Notes

- **PostgreSQL and Redis MUST run in Docker containers only**
- **Do not install PostgreSQL or Redis locally** - this can cause port conflicts
- If you have local PostgreSQL or Redis running, stop them:
  ```bash
  # Stop local PostgreSQL (if running)
  brew services stop postgresql  # macOS
  sudo systemctl stop postgresql  # Linux
  
  # Stop local Redis (if running)
  brew services stop redis  # macOS
  sudo systemctl stop redis  # Linux
  ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires auth)

### Tasks
- `GET /api/tasks` - Get all tasks for authenticated user
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:id` - Get a specific task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `POST /api/tasks/:id/complete` - Mark task as complete

### Query Parameters for GET /api/tasks
- `status` - Filter by status (pending, in_progress, completed)
- `priority` - Filter by priority (low, medium, high)
- `page` - Page number for pagination
- `limit` - Number of items per page

## Request Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Complete project documentation",
    "description": "Write comprehensive API documentation",
    "priority": "high",
    "dueDate": "2024-01-15"
  }'
```

### Get Tasks
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Complete Task
```bash
curl -X POST http://localhost:3000/api/tasks/TASK_ID/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Schema

### Users Table
- `id` - UUID primary key
- `username` - Unique username
- `email` - Unique email address
- `password` - Hashed password
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Tasks Table
- `id` - UUID primary key
- `title` - Task title
- `description` - Task description
- `status` - Task status (pending, in_progress, completed)
- `priority` - Task priority (low, medium, high)
- `due_date` - Due date (optional)
- `completed_at` - Completion timestamp
- `user_id` - Foreign key to users table
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Background Jobs

The system uses Bull queue for background job processing:
- Email notifications when tasks are completed
- Configurable retry logic
- Job cleanup and monitoring

## Caching

Redis is used for caching:
- Incomplete tasks are cached for 5 minutes
- Cache is automatically invalidated when tasks are modified

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Development

Run in development mode with auto-reload:
```bash
npm run dev
```

### Docker Compose Commands

Start services in background:
```bash
docker-compose up -d
```

Stop services:
```bash
docker-compose down
```

View service logs:
```bash
docker-compose logs -f
```

Stop and remove services with volumes:
```bash
docker-compose down -v
```

Check if services are running:
```bash
docker-compose ps
```

Access PostgreSQL database:
```bash
docker-compose exec postgres psql -U postgres -d task_management
```

Create additional databases (if needed):
```bash
docker-compose exec postgres createdb -U postgres your_database_name
```

Access Redis CLI:
```bash
docker-compose exec redis redis-cli
```

### Troubleshooting Port Conflicts

Check if ports are already in use:
```bash
# Check if PostgreSQL port (5432) is in use
lsof -i :5432

# Check if Redis port (6379) is in use  
lsof -i :6379
```

If ports are in use by local services, stop them first before running Docker Compose.

## Testing

*Note: Test suite is currently under development*

## Known Issues

- Email notifications require proper SMTP configuration
- Large task lists may experience performance issues
- Some edge cases in concurrent task updates need handling

## License

MIT 