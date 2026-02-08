# Athena MCP Server

A Model Context Protocol (MCP) server that wraps Athena API endpoints for task management. Provides AI assistants with standardized access to Athena's task management features.

## Features

- Task management (CRUD operations)
- Comments and discussions
- Subtask management
- Deliverable linking
- User search and categories
- Review workflow (approve/reject)
- Environment-based configuration
- Comprehensive mock data for offline testing

## Quick Start

### 1. Install Dependencies

```bash
cd athena-mcp-server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Build and Test

```bash
npm run build
npm run test:mock  # Test with mock data
```

### 4. Run Server

```bash
npm run dev  # Development with mock data
# OR
npm start    # Production (requires real API)
```

## Available Tools

| Tool | Description |
|------|-------------|
| `athena_list_tasks` | List and filter tasks with pagination |
| `athena_get_task` | Get task details by ID |
| `athena_create_task` | Create a new task |
| `athena_update_task` | Update an existing task |
| `athena_add_comment` | Add a comment to a task |
| `athena_get_comments` | Get comments for a task |
| `athena_create_subtask` | Create a subtask |
| `athena_list_subtasks` | List all subtasks for a task |
| `athena_create_deliverable` | Create a deliverable (link/file) |
| `athena_search_users` | Search for users |
| `athena_get_categories` | Get all categories |
| `athena_approve_task` | Approve a task needing review |
| `athena_reject_task` | Reject a task needing review |

## Environment Configuration

### Development (Default)

Uses mock data for testing without real API:
```env
NODE_ENV=development
API_URL=http://localhost:3000
AUTH_TOKEN=optional_token
```

### Testing

Connect to test environment:
```env
NODE_ENV=test
TEST_API_URL=http://test-api.athena.example.com
TEST_AUTH_TOKEN=your_test_token
```

### Production

Full production deployment:
```env
NODE_ENV=production
PROD_API_URL=https://api.athena.example.com
PROD_AUTH_TOKEN=your_production_token
```

## Testing with Mock Data

The server includes comprehensive mock data:

- **Users**: 3 sample users (John, Jane, Bob)
- **Categories**: 4 categories (Development, Design, Marketing, Operations)
- **Tasks**: 5 sample tasks with various statuses
- **Subtasks**: Sample subtasks for task-1
- **Comments**: Sample discussions
- **Deliverables**: Links and files

To test:
```bash
npm run test:mock  # Run validation tests
npm run dev        # Start server with mock data
```

## API Endpoints Wrapped

Based on `athena_flutter/lib/features/tasks/task_service.dart`:

- `GET /api/mobile/tasks` - List tasks with filters
- `GET /api/mobile/tasks/:id` - Get task details
- `POST /api/mobile/tasks` - Create task
- `PATCH /api/mobile/tasks/:id` - Update task
- `GET /api/mobile/tasks/:id/comments` - Get comments
- `POST /api/mobile/tasks/:id/comments` - Add comment
- `GET /api/mobile/tasks/:id/subtasks` - Get subtasks
- `POST /api/mobile/tasks/:id/subtasks` - Create subtask
- `POST /api/mobile/tasks/:id/deliverables` - Create deliverable
- `GET /api/mobile/users?q=...` - Search users
- `GET /api/mobile/categories` - Get categories
- `POST /api/mobile/tasks/:id/review/approve` - Approve task
- `POST /api/mobile/tasks/:id/review/reject` - Reject task

## Project Structure

```
athena-mcp-server/
├── src/
│   ├── server.ts          # Main MCP server
│   ├── tools.ts           # Tool definitions and handlers
│   ├── api.ts             # API client
│   ├── config.ts          # Environment configuration
│   ├── validation.ts      # Input validation with Zod
│   ├── types.ts           # TypeScript type definitions
│   ├── mock-data.ts       # Mock data and data store
│   └── index.test.ts      # Test suite
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── jest.config.js         # Jest test config
├── .env.example           # Environment template
├── README.md              # Documentation
├── DEPLOYMENT.md          # Deployment guide
└── quickstart.sh          # Quick start script
```

## Input Validation

All tools validate input using Zod schemas:

- **Title**: 1-500 characters required
- **Description**: Up to 5000 characters
- **Priority**: low, medium, high, critical
- **Status**: pending, in_progress, completed, archived
- **Pagination**: cursor + limit (max 100)
- **Search query**: Minimum 1 character

## Error Handling

Clear error messages for:
- Validation errors (field-specific)
- API errors (HTTP status + message)
- Network errors
- Resource not found

## Testing

```bash
npm test              # Run all tests with coverage
npm run test:mock     # Run tests against mock data
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment guide including:

- Prerequisites
- Pre-deployment checklist
- Deployment methods (PM2, systemd, Docker)
- Environment configuration
- Security considerations
- Monitoring and logging
- Rollback procedures

## Requirements

- Node.js 18.0 or higher
- npm or yarn
- Athena API access (for non-mock usage)

## Security

- Environment variables for all secrets
- No hardcoded credentials
- HTTPS for API connections
- Token rotation recommended
- Never log sensitive data

## License

ISC
