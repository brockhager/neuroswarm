# Development Guide

This guide covers the development workflow, coding standards, testing practices, and contribution guidelines for the NeuroSwarm project.

## Development Environment

### Required Tools

- **Node.js 18+** with npm
- **Rust 1.70+** with Cargo
- **Docker** for containerized development
- **VS Code** with recommended extensions:
  - Rust Analyzer
  - TypeScript Importer
  - ESLint
  - Prettier

### Environment Setup

1. **Install dependencies:**
   ```bash
   # Node.js dependencies
   npm install

   # Rust dependencies
   cargo build
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Project Structure

```
neuroswarm/
├── neuro-infra/          # Rust daemon (networking, storage)
├── neuro-services/       # TypeScript API server
├── neuro-program/        # Solana smart contracts
├── neuro-web/           # React frontend
├── neuro-shared/        # Shared types and utilities
└── neuroswarm/          # Documentation and coordination
```

## Coding Standards

### TypeScript/JavaScript

- **ESLint** configuration enforced
- **Prettier** for code formatting
- **TypeScript strict mode** enabled
- Use interfaces over types for public APIs
- Prefer async/await over Promises

### Rust

- **Clippy** linting enabled
- Follow standard Rust formatting (`cargo fmt`)
- Use `Result<T, E>` for error handling
- Document public APIs with `///` comments

### General

- **Conventional commits** for all changes
- **Semantic versioning** for releases
- **Security-first** approach to all features
- **Test-driven development** encouraged

## Testing

### Running Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Specific component
cd neuro-services && npm test
cd neuro-infra && cargo test
```

### Test Structure

- **Unit tests** for individual functions
- **Integration tests** for component interaction
- **API tests** for HTTP endpoints
- **Security tests** for authentication and authorization

### Test Coverage Goals

- **Statements:** 95%+
- **Branches:** 85%+
- **Functions:** 100%
- **Lines:** 95%+

## Git Workflow

### Branch Naming

```
feature/add-user-auth
bugfix/fix-memory-leak
docs/update-api-docs
refactor/cleanup-imports
```

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Requests

- **Draft PRs** for work-in-progress
- **Clear descriptions** with context and screenshots
- **Link related issues** in the description
- **Request reviews** from relevant maintainers

## API Development

### REST API Guidelines

- **RESTful** resource naming
- **JSON** responses with consistent structure
- **HTTP status codes** used correctly
- **Versioning** in URL paths (`/v1/`)
- **OpenAPI/Swagger** documentation

### Authentication

- **JWT tokens** for API authentication
- **Bearer token** in Authorization header
- **Role-based access** control
- **Secure token storage** (never in localStorage)

### Error Handling

```typescript
// Success response
{ "data": {...}, "message": "Success" }

// Error response
{ "error": "Error message", "code": "ERROR_CODE" }
```

## Security Considerations

### Code Security

- **Input validation** on all user inputs
- **SQL injection prevention** (parameterized queries)
- **XSS protection** (sanitize outputs)
- **CSRF protection** for state-changing operations

### Infrastructure Security

- **TLS everywhere** for network communication
- **Secrets management** (never commit secrets)
- **Container security** (non-root users, minimal images)
- **Regular dependency updates**

## Performance

### Monitoring

- **Prometheus metrics** for system monitoring
- **Grafana dashboards** for visualization
- **Response time tracking** for APIs
- **Resource usage monitoring**

### Optimization

- **Database query optimization**
- **Caching strategies** for frequently accessed data
- **Lazy loading** for large datasets
- **Connection pooling** for databases

## Deployment

### Local Development

```bash
# Start all services
docker-compose up

# Or individual services
cd neuro-services && npm run dev
cd neuro-infra && cargo run
```

### Production

- **Docker containers** for all services
- **Kubernetes** orchestration
- **CI/CD pipelines** for automated deployment
- **Blue-green deployments** for zero-downtime updates

## Debugging

### Common Issues

- **Port conflicts:** Check what's running on ports 3000, 9090, 3001
- **Database connections:** Verify connection strings and credentials
- **CORS issues:** Check allowed origins in API configuration
- **Token expiration:** JWT tokens expire after 1 hour by default

### Logging

- **Structured logging** with consistent formats
- **Log levels:** ERROR, WARN, INFO, DEBUG
- **Request tracing** with correlation IDs
- **Security event logging** for audit trails

## Contributing

1. **Read the docs** - Start with [getting-started.md](./getting-started.md)
2. **Choose an issue** - Check the [kanban board](./kanban.md)
3. **Follow the workflow** - Branch, develop, test, PR
4. **Ask for help** - Use issues and discussions for questions

## Code Review Checklist

- [ ] Tests pass and coverage maintained
- [ ] Code follows style guidelines
- [ ] Security considerations addressed
- [ ] Documentation updated
- [ ] Breaking changes noted
- [ ] Performance impact assessed

## Resources

- [Architecture Overview](./architecture.md)
- [API Documentation](../neuro-services/docs/services.md)
- [Security Guidelines](./SECURITY-TRUST.md)
- [Kanban Board](./kanban.md)