# Tests

This directory contains all test files for the HexForge Portable Lab Assistant (PLA).

## Structure

```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
├── fixtures/         # Test fixtures and data
├── helpers/          # Test utilities and helpers
└── README.md         # This file
```

## Running Tests

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run specific test suite
cd backend && npm test
cd frontend && npm test
cd assistant && pytest
```

## Writing Tests

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Fast execution

### Integration Tests
- Test component interactions
- Use test database
- More realistic scenarios

### E2E Tests
- Test complete user workflows
- Use test environment
- Critical paths only

## Test Conventions

- Test files: `*.test.js`, `*.spec.js`, `test_*.py`
- Descriptive test names
- Arrange-Act-Assert pattern
- One assertion per test (when reasonable)

## Test Coverage Goals

- Overall: 80%+
- Critical paths: 100%
- New features: 100%

See [Testing Requirements](../CONTRIBUTING.md#testing-requirements) for more details.

---

**Last Updated:** 2026-01-01
