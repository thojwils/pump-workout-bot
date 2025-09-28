const db = require('../db/postgres');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Mock user data
const testUser = {
  username: 'test_user',
  userId: '123456789012345678',
  workoutType: 'full_body'
};

// Create a workout entry for today
async function createWorkout() {
  try {
    console.log(`Creating workout for user: ${testUser.username}`);
    
    const result = await db.insertWorkout({
      username: testUser.username,
      userId: testUser.userId,
      workoutType: testUser.workoutType,
      date: new Date().toISOString()
    });
    
    console.log('✅ Workout created successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Error creating workout:', error.message);
    throw error;
  }
}

// Get workouts for the user
async function getWorkouts() {
  try {
    console.log(`Getting workouts for user: ${testUser.username}`);
    
    const workouts = await db.getUserWorkouts(testUser.username, {
      sort: 'desc',
      limit: 10
    });
    
    console.log(`✅ Retrieved ${workouts.length} workouts:`);
    workouts.forEach((workout, i) => {
      console.log(`${i+1}. ${workout.workout_type} on ${new Date(workout.date).toLocaleString()}`);
    });
    
    return workouts;
  } catch (error) {
    console.error('❌ Error getting workouts:', error.message);
    throw error;
  }
}

// Create game stats for user
async function createGameStats() {
  try {
    console.log(`Setting up game stats for user: ${testUser.username}`);
    
    const stats = await db.getOrCreateGameStats(testUser.username, testUser.userId);
    console.log('✅ Game stats created or retrieved:', stats);
    
    // Update the stats
    const updatedStats = await db.updateGameStats(testUser.userId, {
      points: 10,
      exercises_completed: 2,
      last_exercise: 'Push-ups',
      last_completed: new Date().toISOString(),
      metadata: { test_data: true }
    });
    
    console.log('✅ Game stats updated:', updatedStats);
    return updatedStats;
  } catch (error) {
    console.error('❌ Error with game stats:', error.message);
    throw error;
  }
}

// Get the leaderboard
async function getLeaderboard() {
  try {
    console.log('Getting leaderboard...');
    
    const leaderboard = await db.getLeaderboard(10);
    
    console.log(`✅ Retrieved leaderboard with ${leaderboard.length} entries:`);
    leaderboard.forEach((entry, i) => {
      console.log(`${i+1}. ${entry.username} - ${entry.points} points (${entry.exercises_completed} exercises)`);
    });
    
    return leaderboard;
  } catch (error) {
    console.error('❌ Error getting leaderboard:', error.message);
    throw error;
  }
}

// Run all tests
async function runTests() {
  try {
    console.log('=== Starting User Data Tests ===\n');
    
    // Create a workout
    await createWorkout();
    console.log();
    
    // Get workouts
    await getWorkouts();
    console.log();
    
    // Create/update game stats
    await createGameStats();
    console.log();
    
    // Get leaderboard
    await getLeaderboard();
    
    console.log('\n=== All User Data Tests Completed ===');
  } catch (error) {
    console.error('\nTests failed with error:', error);
  } finally {
    // Close database connection
    await db.pool.end();
  }
}

// Execute if run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  createWorkout,
  getWorkouts,
  createGameStats,
  getLeaderboard,
  runTests
};
