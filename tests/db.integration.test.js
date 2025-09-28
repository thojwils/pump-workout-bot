/*
const db = require('../db/postgres');

// This test suite runs against the actual TEST_DATABASE_URL
describe('Database Integration Tests', () => {

  // Establish connection before any tests run
  beforeAll(async () => {
    await db.connect();
    // Optional: Clean up table before tests
    try {
      await db.query('TRUNCATE TABLE workout_data, game_stats RESTART IDENTITY');
    } catch (e) {
      // Table might not exist on first run, which is okay
    }
  }, 15000); // Increase timeout for this hook to 15s

  // Close connection after all tests are done
  afterAll(async () => {
    await db.end();
  });

  test('should insert a workout and then retrieve it', async () => {
    const workout = {
      userId: 'user-integration-test',
      username: 'Integration Tester',
      workoutType: 'Full Body',
      date: new Date().toISOString(),
    };

    const insertResult = await db.insertWorkout(workout);
    expect(insertResult).toHaveProperty('id');

    const workouts = await db.getUserWorkouts(workout.username);
    expect(workouts).toHaveLength(1);
    expect(workouts[0].user_id).toBe(workout.userId);
    expect(workouts[0].workout_type).toBe(workout.workoutType);
  });

  test('should get or create game stats, then update them', async () => {
    const userId = 'game-stats-test-user';
    const username = 'GameStatsTester';

    // First time, it should create the user with 0 points
    const initialStats = await db.getOrCreateGameStats(username, userId);
    expect(initialStats.user_id).toBe(userId);
    expect(initialStats.points).toBe(0);

    // Second time, it should get the same user
    const retrievedStats = await db.getOrCreateGameStats(username, userId);
    expect(retrievedStats.id).toBe(initialStats.id);

    // Now, update the stats
    const updatedStats = await db.updateGameStats(userId, { points: 150, exercises_completed: 10 });
    expect(updatedStats.points).toBe(150);
    expect(updatedStats.exercises_completed).toBe(10);
  });

  test('should retrieve the leaderboard', async () => {
    // We already inserted a user with 150 points
    const leaderboard = await db.getLeaderboard(5);
    expect(leaderboard).toBeInstanceOf(Array);
    expect(leaderboard.length).toBeGreaterThanOrEqual(1);
    expect(leaderboard[0].username).toBe('GameStatsTester');
    expect(parseInt(leaderboard[0].points)).toBe(150); // Points might be strings
  });
});
*/