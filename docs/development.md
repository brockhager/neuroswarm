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

### How to Contribute: Complete Workflow

Contributing to NeuroSwarm follows a structured workflow that integrates planning, development, testing, and deployment. Here's the complete journey:

#### 1. **Discover & Plan** 📋
- **Check the Kanban:** Review [current tasks](../governance/kanban.md) and [objectives](../governance/objectives.md)
- **Find your role:** Choose based on your skills:
  - **Gateway/API:** Focus on services layer and external interfaces
  - **Indexer:** Work on search, lineage, and data indexing
  - **Validator:** Handle consensus, security, and blockchain integration
  - **Infrastructure:** Core networking, storage, and deployment

#### 2. **Setup Development Environment** 🛠️
- **Follow [Getting Started](../getting-started.md)** to set up all repositories
- **Configure your IDE** with recommended extensions (Rust Analyzer, ESLint, etc.)
- **Run the test suite** to ensure your environment is working

#### 3. **Choose & Claim a Task** 🎯
- **Pick from Kanban:** Select a task that matches your skill level
- **Create feature branch:** `git checkout -b feature/add-user-auth`
- **Update Kanban:** Move task to "In Progress" if you have access

#### 4. **Develop & Code** 💻
- **Follow coding standards:** Use TypeScript strict mode, Rust clippy, conventional commits
- **Write tests first:** Aim for TDD - write tests before implementation
- **Document as you go:** Update relevant docs for any API changes
- **Security first:** Consider security implications of every change

#### 5. **Test Thoroughly** ✅
- **Unit tests:** Cover all new functions and edge cases
- **Integration tests:** Test component interactions
- **API tests:** Verify endpoints work with authentication
- **Security tests:** Test auth failures, input validation
- **Performance tests:** Check resource usage and response times

#### 6. **Code Review & Feedback** 👥
- **Self-review:** Run all checks locally before pushing
- **Create PR:** Write clear description linking to Kanban task
- **Address feedback:** Iterate on reviewer comments
- **Merge when approved:** Squash commits, update Kanban

#### 7. **Deploy & Monitor** 🚀
- **CI/CD:** Automated tests run on every push
- **Staging deployment:** Test in staging environment
- **Production rollout:** Use blue-green deployment for zero downtime
- **Monitor metrics:** Watch dashboards for any issues post-deployment

### Contributor Levels

#### **Beginner Contributors** 🌱
- Start with documentation improvements
- Fix small bugs or add test cases
- Work on UI/UX enhancements
- Focus on getting familiar with the codebase

#### **Intermediate Contributors** 📈
- Implement new API endpoints
- Add features to existing services
- Improve testing infrastructure
- Work on performance optimizations

#### **Advanced Contributors** 🏆
- Design new system components
- Lead architectural decisions
- Mentor other contributors
- Handle security-critical features

### Recognition & Rewards

- **GitHub contributions** are tracked and celebrated
- **Code review participation** earns contributor badges
- **Documentation improvements** are highly valued
- **Security contributions** receive special recognition
- **Community leadership** roles for consistent contributors

### Getting Help

- **Documentation:** Start with [Getting Started](../getting-started.md)
- **Issues:** Open GitHub issues for bugs or questions
- **Discussions:** Use GitHub Discussions for design questions
- **Discord/Telegram:** Join community chat for real-time help
- **Mentorship:** Request a mentor for complex contributions

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
- [Kanban Board](./governance/kanban.md)