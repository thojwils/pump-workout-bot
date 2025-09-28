// tests/command-setup.js

// Mock the pg module before any requires that might use it
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    on: jest.fn(),
    end: jest.fn().mockResolvedValue({}),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    })
  };
  
  return { 
    Pool: jest.fn(() => mockPool)
  };
});

// Mock the database module for command tests
jest.mock('../db/postgres', () => {
  const originalModule = jest.requireActual('../db/postgres');
  return {
    ...originalModule,
    query: jest.fn().mockImplementation((sql, params) => {
      if (sql.includes('to_regclass')) {
        const tableNameMatch = sql.match(/to_regclass\('([^']+)'\)/);
        const tableName = tableNameMatch ? tableNameMatch[1] : null;
        return Promise.resolve({ rows: [{ table_exists: tableName }] });
      }
      return Promise.resolve({ rows: [] });
    }),
    insertWorkout: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    getUserWorkouts: jest.fn().mockResolvedValue([]),
    getOrCreateGameStats: jest.fn((username, userId) => Promise.resolve({ user_id: userId, username, points: 0, exercises_completed: 0 })),
    updateGameStats: jest.fn((userId, updates) => Promise.resolve({ user_id: userId, ...updates })),
    getLeaderboard: jest.fn().mockResolvedValue([]),
  };
});
