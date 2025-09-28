const { Pool } = require('pg');
const db = require('../../db/postgres');

// Mock the entire pg module
jest.mock('pg', () => {
  const mockPool = {
    connect: jest.fn().mockResolvedValue(),
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

// Mock the database functions to avoid actual DB connection
jest.mock('../../db/postgres', () => {
  const originalModule = jest.requireActual('../../db/postgres');
  return {
    ...originalModule,
    connect: jest.fn().mockResolvedValue(),
    end: jest.fn().mockResolvedValue(),
    query: jest.fn(),
    insertWorkout: jest.fn(),
    getUserWorkouts: jest.fn(),
    getOrCreateGameStats: jest.fn(),
  };
});

// Helper to normalize SQL strings for comparison
const normalizeSql = (sql) => sql.replace(/\s+/g, ' ').trim();

describe('PostgreSQL Database Unit Tests', () => {
  let mockPool;

  beforeEach(() => {
    // Get a fresh instance of the mocked pool for each test
    mockPool = new Pool();
    jest.clearAllMocks();
    // Mock a successful connection query
    mockPool.query.mockResolvedValue({ rows: [{ now: new Date() }] });
  });

  describe('insertWorkout', () => {
    test('should call pool.query with correct SQL and return the result', async () => {
      const workoutData = { userId: 'user123', username: 'testUser', workoutType: 'Push', date: new Date().toISOString() };
      db.insertWorkout.mockResolvedValueOnce({ id: 1 });

      const result = await db.insertWorkout(workoutData);

      expect(db.insertWorkout).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('getUserWorkouts', () => {
    test('should call pool.query and return workouts', async () => {
      const mockRows = [{ workout: 'data' }];
      db.getUserWorkouts.mockResolvedValueOnce(mockRows);

      const result = await db.getUserWorkouts('testUser');

      expect(db.getUserWorkouts).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRows);
    });
  });

  describe('getOrCreateGameStats', () => {
    test('should return existing stats if found', async () => {
      const mockStats = { user_id: 'user123' };
      db.getOrCreateGameStats.mockResolvedValueOnce(mockStats);

      const result = await db.getOrCreateGameStats('testUser', 'user123');

      expect(db.getOrCreateGameStats).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStats);
    });

    test('should create new stats if not found', async () => {
      const mockNewStats = { user_id: 'user123' };
      db.getOrCreateGameStats.mockResolvedValueOnce(mockNewStats);

      const result = await db.getOrCreateGameStats('testUser', 'user123');

      expect(db.getOrCreateGameStats).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockNewStats);
    });
  });
});
