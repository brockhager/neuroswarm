# Contributor Workflows

This guide outlines the standard workflows for contributing to NeuroSwarm.

## 🔄 Pull Request Process

1.  **Fork & Branch**: Fork the repo and create a feature branch (`feature/my-feature`) or fix branch (`fix/issue-123`).
2.  **Commit Standards**: Use conventional commits (e.g., `feat: add new validator`, `fix: resolve memory leak`).
3.  **Tests**: Ensure all existing tests pass and add new tests for your changes.
4.  **Linting**: Run `npm run lint` to ensure code style consistency.
5.  **PR Description**: clearly describe the problem and solution. Link to related issues.

## 🧪 Testing Standards

- **Unit Tests**: Required for all new utility functions and services.
- **Integration Tests**: Required for new API endpoints.
- **Performance Benchmarks**: Run `npm run benchmark` if touching core inference logic.

## 📦 Release Process

(For Maintainers)

1.  Update `CHANGELOG.md`.
2.  Bump version in `package.json`.
3.  Create a new Git tag (`v1.2.3`).
4.  Push tag to trigger release workflow.

## 🐛 Reporting Issues

- **Bug Reports**: Include reproduction steps, environment details, and logs.
- **Feature Requests**: Describe the use case and proposed solution.
