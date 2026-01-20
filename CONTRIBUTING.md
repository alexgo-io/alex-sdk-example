# Contributing to ALEX SDK Example

Thank you for your interest in contributing to the ALEX SDK Example project! This document provides guidelines for contributing.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- pnpm package manager

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/alex-sdk-example.git
   cd alex-sdk-example
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```

## Development Workflow

### Making Changes

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Test your changes locally by running the dev server
4. Commit your changes with a descriptive message:
   ```bash
   git commit -m "feat: add your feature description"
   ```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Submitting a Pull Request

1. Push your changes to your fork
2. Open a Pull Request against the `main` branch
3. Provide a clear description of your changes
4. Wait for review and address any feedback

## Code Style

- Use TypeScript for type safety
- Follow the existing code patterns in the project
- Use meaningful variable and function names
- Add comments for complex logic

## Questions?

If you have questions, feel free to open an issue for discussion.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
