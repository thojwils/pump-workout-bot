-- PumpBot PostgreSQL Schema with JSONB support
-- This schema replaces the MongoDB collections with PostgreSQL tables

-- Create workout_data table (replaces workoutData collection)
CREATE TABLE IF NOT EXISTS workout_data (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    workout_type TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Index for faster lookups by user
    INDEX idx_workout_data_user_id (user_id),
    -- Index for faster lookups by date
    INDEX idx_workout_data_date (date),
    -- Index for JSON queries on metadata
    INDEX idx_workout_data_metadata USING GIN (metadata)
);

-- Create game_stats table (replaces gameStats collection)
CREATE TABLE IF NOT EXISTS game_stats (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    exercises_completed INTEGER NOT NULL DEFAULT 0,
    last_exercise TEXT,
    last_completed TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Index for faster lookups by user
    INDEX idx_game_stats_user_id (user_id),
    -- Index for leaderboard queries
    INDEX idx_game_stats_points (points DESC),
    -- Index for JSON queries on metadata
    INDEX idx_game_stats_metadata USING GIN (metadata)
);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on game_stats table
CREATE TRIGGER update_game_stats_updated_at
BEFORE UPDATE ON game_stats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
