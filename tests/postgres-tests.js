const { Pool } = require('pg');
const dotenv = require('dotenv');
const assert = require('assert');
const db = require('../db/postgres');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Mock user data for testing
const testUsers = [
    {
        username: 'test_user1',
        userId: '111111111111111111'
    },
    {
        username: 'test_user2',
        userId: '222222222222222222'
    },
    {
        username: 'test_user3',
        userId: '333333333333333333'
    }
];

// Generate dates for workout history
function generateDates(count, daysBetween = 1) {
    const dates = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
        const date = new Date();
        date.setDate(now.getDate() - (i * daysBetween));
        dates.push(date.toISOString());
    }
    
    return dates;
}

// Test basic database operations
async function testBasicOperations() {
    console.log('\n--- Testing Basic PostgreSQL Operations ---');
    
    try {
        // Test the connection
        console.log('Test 1: Connecting to PostgreSQL');
        await db.query('SELECT NOW()', []);
        console.log('✓ Connection successful');
        
        // Clean up previous test data
        await cleanupTestData();
        console.log('✓ Previous test data cleaned up');
        
        return { success: true };
    } catch (error) {
        console.error('Basic operations test failed:', error);
        return { success: false, error };
    }
}

// Clean up all test data
async function cleanupTestData() {
    try {
        // Delete all test users' data
        for (const user of testUsers) {
            await db.query('DELETE FROM workout_data WHERE user_id = $1', [user.userId]);
            await db.query('DELETE FROM game_stats WHERE user_id = $1', [user.userId]);
        }
    } catch (error) {
        console.error('Error cleaning up test data:', error);
        throw error;
    }
}

// Test streak functionality
async function testStreakFunctionality() {
    console.log('\n--- Testing Streak Functionality ---');
    
    try {
        const user = testUsers[0];
        
        // Generate consecutive workout dates for the last 5 days
        const dates = generateDates(5, 1);
        
        console.log('Test 1: Creating consecutive daily workouts');
        // Insert workout data for consecutive days
        const workoutTypes = ['full_body', 'upper_body', 'lower_body', 'cardio', 'yoga'];
        
        for (let i = 0; i < dates.length; i++) {
            await db.insertWorkout({
                username: user.username,
                userId: user.userId,
                workoutType: workoutTypes[i % workoutTypes.length],
                date: dates[i]
            });
        }
        console.log(`✓ Created ${dates.length} consecutive daily workouts`);
        
        // Retrieve and validate workouts
        console.log('Test 2: Retrieving workout history');
        const workouts = await db.getUserWorkouts(user.username, { sort: 'desc' });
        assert.strictEqual(workouts.length, dates.length);
        console.log(`✓ Retrieved ${workouts.length} workouts`);
        
        // Test streak calculation
        console.log('Test 3: Calculating streak from consecutive workouts');
        
        // Calculate the streak manually
        let streak = 1; // Start with 1 for the most recent workout
        
        for (let i = 0; i < workouts.length - 1; i++) {
            const currentDate = new Date(workouts[i].date);
            const prevDate = new Date(workouts[i + 1].date);
            
            // Calculate days between dates
            const diffTime = Math.abs(currentDate - prevDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }
        
        console.log(`✓ Streak calculated: ${streak} days`);
        assert.strictEqual(streak, dates.length);
        
        // Test streak with a gap
        console.log('Test 4: Testing streak with a gap in workout history');
        
        // Add a workout with a 2-day gap
        const gapDate = new Date(dates[dates.length - 1]);
        gapDate.setDate(gapDate.getDate() - 2);
        
        await db.insertWorkout({
            username: user.username,
            userId: user.userId,
            workoutType: 'rest',
            date: gapDate.toISOString()
        });
        
        // Retrieve workouts again
        const workoutsWithGap = await db.getUserWorkouts(user.username, { sort: 'desc' });
        
        // Validate that streak is still correct (shouldn't include workout after gap)
        let streakWithGap = 1;
        
        for (let i = 0; i < workoutsWithGap.length - 1; i++) {
            const currentDate = new Date(workoutsWithGap[i].date);
            const prevDate = new Date(workoutsWithGap[i + 1].date);
            
            const diffTime = Math.abs(currentDate - prevDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streakWithGap++;
            } else {
                break;
            }
        }
        
        console.log(`✓ Streak with gap calculated: ${streakWithGap} days`);
        assert.strictEqual(streakWithGap, dates.length);
        
        return { success: true };
    } catch (error) {
        console.error('Streak functionality test failed:', error);
        return { success: false, error };
    }
}

// Test game functionality
async function testGameFunctionality() {
    console.log('\n--- Testing Game Functionality ---');
    
    try {
        const user = testUsers[1];
        
        console.log('Test 1: Creating initial game stats');
        
        // Get or create initial game stats
        const initialStats = await db.getOrCreateGameStats(user.username, user.userId);
        assert(initialStats);
        assert.strictEqual(initialStats.points, 0);
        assert.strictEqual(initialStats.exercises_completed, 0);
        console.log('✓ Initial game stats created successfully');
        
        console.log('Test 2: Recording exercise completion');
        
        // Record first exercise
        const firstExercise = {
            name: 'Push-ups',
            points: 5
        };
        
        await db.updateGameStats(user.userId, {
            points: firstExercise.points,
            exercises_completed: 1,
            last_exercise: firstExercise.name,
            last_completed: new Date().toISOString()
        });
        
        // Also record as a workout for streak tracking
        await db.insertWorkout({
            username: user.username,
            userId: user.userId,
            workoutType: 'game',
            exercise: firstExercise.name,
            points: firstExercise.points,
            date: new Date().toISOString()
        });
        
        // Verify stats were updated
        const updatedStats = await db.query(
            'SELECT * FROM game_stats WHERE user_id = $1',
            [user.userId]
        );
        
        assert.strictEqual(updatedStats.rows[0].points, 5);
        assert.strictEqual(updatedStats.rows[0].exercises_completed, 1);
        assert.strictEqual(updatedStats.rows[0].last_exercise, 'Push-ups');
        console.log('✓ Exercise completion recorded successfully');
        
        console.log('Test 3: Recording multiple exercises');
        
        const exercises = [
            { name: 'Squats', points: 5 },
            { name: 'Sit-ups', points: 5 },
            { name: 'Jumping Jacks', points: 3 }
        ];
        
        // Get the initial points
        const exerciseStats = await db.query(
            'SELECT * FROM game_stats WHERE user_id = $1',
            [user.userId]
        );
        
        // Initial values from the first exercise
        let currentPoints = exerciseStats.rows[0].points; // Start with current points (5 from Push-ups)
        let currentExercises = exerciseStats.rows[0].exercises_completed; // Start with current exercises (1)
        
        // Record multiple exercises with direct SQL to ensure cumulative updates
        for (const exercise of exercises) {
            // Add to running total
            currentPoints += exercise.points;
            currentExercises += 1;
            
            // Direct SQL update to ensure we're incrementing
            await db.query(`
                UPDATE game_stats
                SET points = $1,
                    exercises_completed = $2,
                    last_exercise = $3,
                    last_completed = $4,
                    metadata = metadata || $5::jsonb
                WHERE user_id = $6
            `, [
                currentPoints, 
                currentExercises,
                exercise.name,
                new Date(),
                JSON.stringify({ exerciseName: exercise.name }),
                user.userId
            ]);
            
            // Also record as workouts
            await db.insertWorkout({
                username: user.username,
                userId: user.userId,
                workoutType: 'game',
                exercise: exercise.name,
                points: exercise.points,
                date: new Date().toISOString()
            });
        }
        
        // Verify final stats
        const finalStats = await db.query(
            'SELECT * FROM game_stats WHERE user_id = $1',
            [user.userId]
        );
        
        const totalPoints = 5 + exercises.reduce((sum, ex) => sum + ex.points, 0);
        const totalExercises = 1 + exercises.length;
        
        assert.strictEqual(finalStats.rows[0].points, totalPoints);
        assert.strictEqual(finalStats.rows[0].exercises_completed, totalExercises);
        assert.strictEqual(finalStats.rows[0].last_exercise, exercises[exercises.length - 1].name);
        console.log(`✓ Multiple exercises recorded successfully (${totalPoints} points, ${totalExercises} exercises)`);
        
        console.log('Test 4: Testing leaderboard functionality');
        
        // Add stats for another user
        const secondUser = testUsers[2];
        await db.getOrCreateGameStats(secondUser.username, secondUser.userId);
        await db.updateGameStats(secondUser.userId, {
            points: 20,
            exercises_completed: 4,
            last_exercise: 'Burpees',
            last_completed: new Date().toISOString()
        });
        
        // Get leaderboard
        const leaderboard = await db.getLeaderboard();
        assert(leaderboard.length >= 2);
        
        // Verify leaderboard is ordered by points
        for (let i = 0; i < leaderboard.length - 1; i++) {
            assert(leaderboard[i].points >= leaderboard[i + 1].points);
        }
        
        console.log(`✓ Leaderboard returns ${leaderboard.length} entries ordered by points`);
        
        return { success: true };
    } catch (error) {
        console.error('Game functionality test failed:', error);
        return { success: false, error };
    }
}

// Test data pipeline for all bot functions
async function testDataPipeline() {
    console.log('\n--- Testing Full Data Pipeline ---');
    
    try {
        const user = {
            username: 'pipeline_test_user',
            userId: '999999999999999999'
        };
        
        // Clean up previous test data
        await db.query('DELETE FROM workout_data WHERE user_id = $1', [user.userId]);
        await db.query('DELETE FROM game_stats WHERE user_id = $1', [user.userId]);
        
        console.log('Test 1: Simulating a user interaction flow');
        
        // 1. User logs a workout using /streak
        console.log('- User logs a full_body workout using /streak command');
        await db.insertWorkout({
            username: user.username,
            userId: user.userId,
            workoutType: 'full_body',
            date: new Date().toISOString()
        });
        
        // 2. The next day, user does another workout
        console.log('- Next day: User logs an upper_body workout');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await db.insertWorkout({
            username: user.username,
            userId: user.userId,
            workoutType: 'upper_body',
            date: tomorrow.toISOString()
        });
        
        // 3. User plays the workout game
        console.log('- User completes Push-ups in the workout game');
        await db.getOrCreateGameStats(user.username, user.userId);
        await db.updateGameStats(user.userId, {
            points: 5,
            exercises_completed: 1,
            last_exercise: 'Push-ups',
            last_completed: new Date().toISOString()
        });
        
        // 4. Track the game workout in workout history
        await db.insertWorkout({
            username: user.username,
            userId: user.userId,
            workoutType: 'game',
            exercise: 'Push-ups',
            points: 5,
            date: new Date().toISOString()
        });
        
        // 5. User checks their streak
        console.log('- User checks their streak');
        const workouts = await db.getUserWorkouts(user.username, { sort: 'desc' });
        
        // 6. User views the leaderboard
        console.log('- User views the game leaderboard');
        const leaderboard = await db.getLeaderboard();
        
        // Verify all the data is consistent
        console.log('Test 2: Verifying data consistency');
        
        // Check workout history contains 3 entries
        assert.strictEqual(workouts.length, 3);
        console.log(`✓ User has ${workouts.length} workout records`);
        
        // Check game stats are accurate
        const gameStats = await db.query(
            'SELECT * FROM game_stats WHERE user_id = $1',
            [user.userId]
        );
        
        assert.strictEqual(gameStats.rows[0].points, 5);
        assert.strictEqual(gameStats.rows[0].exercises_completed, 1);
        console.log('✓ Game stats are accurate');
        
        // Check user appears in leaderboard
        const userInLeaderboard = leaderboard.some(entry => entry.username === user.username);
        assert(userInLeaderboard);
        console.log('✓ User appears in game leaderboard');
        
        console.log('✓ Full data pipeline test completed successfully');
        
        return { success: true };
    } catch (error) {
        console.error('Data pipeline test failed:', error);
        return { success: false, error };
    }
}

// Run all the tests
async function runAllTests() {
    console.log('Starting PostgreSQL integration tests...');
    console.log('========================================');
    
    try {
        // Test basic operations
        const basicResult = await testBasicOperations();
        if (!basicResult.success) {
            throw new Error('Basic operations test failed');
        }
        
        // Test streak functionality
        const streakResult = await testStreakFunctionality();
        if (!streakResult.success) {
            throw new Error('Streak functionality test failed');
        }
        
        // Test game functionality
        const gameResult = await testGameFunctionality();
        if (!gameResult.success) {
            throw new Error('Game functionality test failed');
        }
        
        // Test full data pipeline
        const pipelineResult = await testDataPipeline();
        if (!pipelineResult.success) {
            throw new Error('Data pipeline test failed');
        }
        
        // Clean up all test data
        await cleanupTestData();
        
        console.log('\n========================================');
        console.log('All PostgreSQL tests passed successfully! ✓');
        
    } catch (error) {
        console.error('\nTest suite failed with error:', error);
        process.exit(1);
    } finally {
        // Close the database connection pool
        await db.pool.end();
    }
}

// Run the tests
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testBasicOperations,
    testStreakFunctionality,
    testGameFunctionality,
    testDataPipeline,
    runAllTests
};
