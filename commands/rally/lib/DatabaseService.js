/**
 * DatabaseService.js
 * Database operations for the Reaction Rally game.
 * This file exports a singleton instance of the service.
 */
const db = require('../../../db/postgres');

class DatabaseService {
  /**
   * Create the database schema if it doesn't exist.
   * This should be called once at application startup.
   * @returns {Promise<void>}
   */
  async createSchemaIfNeeded() {
    try {
      const tableCheck = await db.query(`
        SELECT to_regclass('public.rally_stats') as table_exists;
      `);
      
      if (!tableCheck.rows[0].table_exists) {
        console.log('Creating rally_stats table...');
        await db.query(`
          CREATE TABLE rally_stats (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL,
            games_played INTEGER DEFAULT 0,
            latest_score INTEGER DEFAULT 0,
            highest_score INTEGER DEFAULT 0,
            highest_level INTEGER DEFAULT 0,
            total_perfect_rounds INTEGER DEFAULT 0,
            total_score BIGINT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
        console.log('rally_stats table created successfully.');
      }
    } catch (error) {
      console.error('Error creating rally schema:', error);
      // Do not re-throw here, as it can crash the app on startup.
      // The error is already logged.
    }
  }

  /**
   * Save a player's score to the database.
   * @param {string} userId - Discord user ID
   * @param {string} username - Discord username
   * @param {number} score - Game score
   * @param {number} level - Highest level reached
   * @param {number} perfectRounds - Number of perfect rounds
   * @returns {Promise<boolean>} Whether the score was saved successfully
   */
  async saveScore(userId, username, score, level, perfectRounds) {
    try {
      const stats = await this.getPlayerStats(userId);
      
      if (stats) {
        const highestScore = Math.max(stats.highest_score, score);
        const highestLevel = Math.max(stats.highest_level, level);
        
        await db.query(
          `UPDATE rally_stats 
           SET games_played = games_played + 1, 
               latest_score = $1, 
               highest_score = $2, 
               highest_level = $3, 
               total_perfect_rounds = total_perfect_rounds + $4, 
               total_score = total_score + $5, 
               updated_at = NOW() 
           WHERE user_id = $6`,
          [score, highestScore, highestLevel, perfectRounds, score, userId]
        );
      } else {
        await db.query(
          `INSERT INTO rally_stats (user_id, username, games_played, latest_score, highest_score, highest_level, total_perfect_rounds, total_score) 
           VALUES ($1, $2, 1, $3, $4, $5, $6, $7)`,
          [userId, username, score, score, level, perfectRounds, score]
        );
      }
      return true;
    } catch (error) {
      console.error('Error saving rally score:', error);
      return false;
    }
  }
  
  /**
   * Get a player's game statistics.
   * @param {string} userId - Discord user ID
   * @returns {Promise<Object|null>} Player stats or null if not found
   */
  async getPlayerStats(userId) {
    try {
      const result = await db.query('SELECT * FROM rally_stats WHERE user_id = $1', [userId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting rally stats:', error);
      throw error;
    }
  }
  
  /**
   * Get the leaderboard.
   * @param {number} limit - Maximum number of entries to return (default: 10)
   * @returns {Promise<Array>} Leaderboard entries
   */
  async getLeaderboard(limit = 10) {
    try {
      const result = await db.query(
        'SELECT username, highest_score, highest_level FROM rally_stats ORDER BY highest_score DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting rally leaderboard:', error);
      throw error;
    }
  }
}

// Export a single, shared instance of the service (singleton pattern)
module.exports = new DatabaseService();
