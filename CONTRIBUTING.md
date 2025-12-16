# Contributing to Napkin AI MCP Server

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/LouisChanCLY/napkin-ai-mcp.git
cd napkin-ai-mcp

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Code Style

- TypeScript strict mode is enabled
- ESLint and Prettier are configured
- Run `npm run lint` before committing
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

## Commit Messages

Use semantic commit messages:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `test:` - Test additions or fixes
- `refactor:` - Code refactoring

Example: `feat: add support for custom visual styles`

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm run lint`
6. Commit with a semantic message
7. Push to your fork
8. Open a pull request

## Reporting Issues

When reporting issues, please include:

- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behaviour
- Error messages or logs (with `NAPKIN_DEBUG=true`)

## API Compatibility

This MCP server is tested against Napkin AI API v0.10.5. If you encounter issues with newer API versions, please open an issue with details about the API response changes.

## Questions?

Open a GitHub issue for questions or discussion.
