# PumpBot Testing Documentation

This document provides information about the test suite for PumpBot, including setup instructions, test organization, and how to run the tests.

## Test Structure

The tests are organized in the following directories:

```
tests/
├── commands/         # Discord command tests
│   ├── game.test.js  # Tests for /game command
│   ├── pump.test.js  # Tests for /pump command
│   └── streak.test.js # Tests for /streak command
├── db/               # Database tests
│   └── postgres.test.js # Tests for PostgreSQL functions
├── postgres-tests.js # Integration tests for PostgreSQL
└── README.md         # This documentation
```

## Setup

### Prerequisites

- Node.js v18.14.x or higher
- Jest test framework (installed as a devDependency)
- PostgreSQL database (for integration tests)

### Environment Setup

1. Create a `.env.test` file in the project root with your test database configuration:

```
# Test Database Configuration
DATABASE_URL=postgres://username:password@localhost:5432/pumpbot_test
```

2. Install dependencies:

```bash
npm install
```

## Running Tests

### All Tests

To run all tests:

```bash
npm test
```

This runs both the Jest tests and the PostgreSQL integration tests.

### Database Tests Only

To run only the database integration tests:

```bash
npm run test:db
```

### Command Tests Only

To run only the command tests:

```bash
npm run test:commands
```

### Individual Test Files

To run a specific test file:

```bash
npx jest tests/commands/game.test.js
```

## Test Coverage

The tests cover:

### Command Tests

- **game.js**: Tests the `/game` command functionality, including:
  - Starting a game challenge
  - Showing the leaderboard
  - Button interactions for completing/skipping exercises

- **pump.js**: Tests the `/pump` command functionality, including:
  - Recording workouts
  - Calculating streaks
  - Displaying different messages for workout types

- **streak.js**: Tests the `/streak` command which is an alias for the `/pump` command

### Database Tests

- **postgres.test.js**: Unit tests for database functions using mocks:
  - `insertWorkout`
  - `getUserWorkouts`
  - `getLeaderboard`
  - `getOrCreateGameStats`
  - `updateGameStats`

- **postgres-tests.js**: Integration tests with a real PostgreSQL database

## Mocking

The tests use Jest's mocking capabilities to isolate units of code:

- Discord.js interactions are mocked to simulate user interactions
- Database functions are mocked to avoid actual database calls during unit tests
- Date/time functions are mocked to ensure consistent results

## Adding New Tests

When adding new features, follow these guidelines for testing:

1. Create unit tests that focus on specific functionality
2. Mock external dependencies
3. Use descriptive test names that explain what is being tested
4. Follow the AAA pattern (Arrange, Act, Assert)

## Continuous Integration

The test suite is designed to work with CI/CD pipelines. The following command can be used in CI environments:

```bash
npm test -- --ci
```

## Common Issues

- **Database Connection Errors**: Ensure your PostgreSQL server is running and the connection URL in `.env.test` is correct.
- **Timing Issues**: Some tests mock date/time functions. If tests fail with timing issues, check the mock implementations.
- **Missing Dependencies**: Ensure all npm packages are installed with `npm install`.
