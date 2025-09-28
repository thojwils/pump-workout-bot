const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

let pool;

/**
 * Creates necessary database tables if they don't exist.
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
    try {
        // Check if workout_data table exists
        const workoutTableCheck = await pool.query(`
            SELECT to_regclass('public.workout_data') as table_exists;
        `);

        if (!workoutTableCheck.rows[0].table_exists) {
            console.log('Creating workout_data table...');
            await pool.query(`
                CREATE TABLE workout_data (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    workout_type TEXT NOT NULL,
                    date TIMESTAMP WITH TIME ZONE NOT NULL,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE INDEX idx_workout_data_user_id ON workout_data(user_id);
                CREATE INDEX idx_workout_data_username ON workout_data(username);
                CREATE INDEX idx_workout_data_date ON workout_data(date);
            `);
            console.log('workout_data table created successfully.');
        }

        // Check if game_stats table exists
        const gameStatsCheck = await pool.query(`
            SELECT to_regclass('public.game_stats') as table_exists;
        `);

        if (!gameStatsCheck.rows[0].table_exists) {
            console.log('Creating game_stats table...');
            await pool.query(`
                CREATE TABLE game_stats (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL UNIQUE,
                    username TEXT NOT NULL,
                    points INTEGER DEFAULT 0,
                    exercises_completed INTEGER DEFAULT 0,
                    last_exercise TEXT,
                    last_completed TIMESTAMP WITH TIME ZONE,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE INDEX idx_game_stats_user_id ON game_stats(user_id);
                CREATE INDEX idx_game_stats_username ON game_stats(username);
            `);
            console.log('game_stats table created successfully.');
        }
    } catch (error) {
        console.error('Error initializing database tables:', error);
        // Log but don't throw to prevent app crash on startup
    }
}

/**
 * Establishes the database connection pool.
 * Should be called once at application startup.
 */
async function connect() {
    if (pool) {
        return;
    }

    const connectionString = process.env.NODE_ENV === 'test' 
        ? process.env.TEST_DATABASE_URL 
        : process.env.DATABASE_URL;

    pool = new Pool({
        connectionString,
        ssl: process.env.DISABLE_SSL ? false : {
            rejectUnauthorized: false
        }
    });

    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
    });

    try {
        await pool.query('SELECT NOW()');
        console.log('Database connection pool established.');
        
        // Initialize database tables
        await initializeDatabase();
    } catch (err) {
        console.error('Failed to establish database connection:', err);
        pool = null; // Reset pool on connection failure
        process.exit(1);
    }
}

/**
 * Closes the database connection pool.
 * Should be called once when the application shuts down or tests complete.
 */
async function end() {
    if (pool) {
        await pool.end();
        console.log('Database connection pool closed.');
        pool = null;
    }
}

/**
 * Executes a SQL query.
 * @param {string} text - The SQL query text.
 * @param {Array} params - The query parameters.
 * @returns {Promise<QueryResult>} The query result.
 */
async function query(text, params) {
    if (!pool) {
        throw new Error('Database not connected. Call connect() before querying.');
    }
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('Executed query', { text, duration: `${duration}ms`, rows: res.rowCount });
    return res;
}

/**
 * Insert workout data
 * @param {Object} workout - Workout data object
 * @returns {Promise} - Insert result promise
 */
async function insertWorkout(workout) {
    const { username, userId, workoutType, date } = workout;
    const { username: _, userId: __, workoutType: ___, date: ____, ...metadata } = workout;
    
    const text = `
        INSERT INTO workout_data(user_id, username, workout_type, date, metadata)
        VALUES($1, $2, $3, $4, $5)
        RETURNING id
    `;
    const values = [userId, username, workoutType, new Date(date), JSON.stringify(metadata)];
    
    try {
        const res = await query(text, values);
        return res.rows[0];
    } catch (error) {
        console.error('Error inserting workout:', error);
        throw error;
    }
}

/**
 * Get user's workouts
 * @param {string} username - User's username
 * @param {Object} options - Query options
 * @returns {Promise} - Query result promise
 */
async function getUserWorkouts(username, options = {}) {
    const { limit = 100, sort = 'desc', workoutType = null } = options;
    
    let text = `
        SELECT * FROM workout_data
        WHERE username = $1
    `;
    const values = [username];
    
    if (workoutType) {
        text += ` AND workout_type = $${values.length + 1}`;
        values.push(workoutType);
    }
    
    text += ` ORDER BY date ${sort === 'asc' ? 'ASC' : 'DESC'}`;
    text += ` LIMIT $${values.length + 1}`;
    values.push(limit);
    
    try {
        const res = await query(text, values);
        return res.rows;
    } catch (error) {
        console.error('Error getting user workouts:', error);
        throw error;
    }
}

/**
 * Get or create game stats for a user
 * @param {string} username - User's username
 * @param {string} userId - User's ID
 * @returns {Promise} - Query result promise
 */
async function getOrCreateGameStats(username, userId) {
    try {
        let res = await query('SELECT * FROM game_stats WHERE user_id = $1', [userId]);
        
        if (res.rows.length === 0) {
            const insertText = `
                INSERT INTO game_stats(user_id, username, points, exercises_completed)
                VALUES($1, $2, 0, 0)
                RETURNING *
            `;
            res = await query(insertText, [userId, username]);
        }
        
        return res.rows[0];
    } catch (error) {
        console.error('Error getting or creating game stats:', error);
        throw error;
    }
}

/**
 * Update game stats for a user
 * @param {string} userId - User's ID
 * @param {Object} updates - Fields to update
 * @returns {Promise} - Update result promise
 */
async function updateGameStats(userId, updates) {
    const validFields = ['points', 'exercises_completed', 'last_exercise', 'last_completed', 'metadata'];
    const fields = Object.keys(updates).filter(field => validFields.includes(field));
    
    if (fields.length === 0) {
        throw new Error('No valid fields to update');
    }
    
    const setClause = fields.map((field, i) => {
        if (field === 'metadata') {
            return `${field} = ${field} || $${i + 1}::jsonb`;
        }
        return `${field} = $${i + 1}`;
    }).join(', ');
    
    const text = `
        UPDATE game_stats
        SET ${setClause}
        WHERE user_id = $${fields.length + 1}
        RETURNING *
    `;
    
    const values = fields.map(field => {
        if (field === 'metadata') {
            return JSON.stringify(updates[field]);
        }
        if (field === 'last_completed') {
            return new Date(updates[field]);
        }
        return updates[field];
    });
    values.push(userId);
    
    try {
        const res = await query(text, values);
        return res.rows[0];
    } catch (error) {
        console.error('Error updating game stats:', error);
        throw error;
    }
}

/**
 * Get leaderboard
 * @param {number} limit - Number of users to retrieve
 * @returns {Promise} - Query result promise
 */
async function getLeaderboard(limit = 10) {
    const text = `
        SELECT username, points, exercises_completed
        FROM game_stats
        ORDER BY points DESC
        LIMIT $1
    `;
    
    try {
        const res = await query(text, [limit]);
        return res.rows;
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        throw error;
    }
}

module.exports = {
    connect,
    end,
    query,
    insertWorkout,
    getUserWorkouts,
    getOrCreateGameStats,
    updateGameStats,
    getLeaderboard,
};