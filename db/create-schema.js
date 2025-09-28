const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get database URL from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  console.error('Please set your Neon PostgreSQL connection string in the .env file.');
  process.exit(1);
}

async function createSchema() {
  // Define the SQL statements as separate queries
  const statements = [
    {
      name: 'Create workout_data table',
      sql: `
        CREATE TABLE IF NOT EXISTS workout_data (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          workout_type TEXT NOT NULL,
          date TIMESTAMP WITH TIME ZONE NOT NULL,
          metadata JSONB DEFAULT '{}'::JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: 'Create game_stats table',
      sql: `
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
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: 'Create update_updated_at_column function',
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'Create update trigger',
      sql: `
        CREATE TRIGGER update_game_stats_updated_at
        BEFORE UPDATE ON game_stats
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `
    },
    {
      name: 'Create workout_data user_id index',
      sql: `CREATE INDEX IF NOT EXISTS idx_workout_data_user_id ON workout_data(user_id);`
    },
    {
      name: 'Create workout_data date index',
      sql: `CREATE INDEX IF NOT EXISTS idx_workout_data_date ON workout_data(date);`
    },
    {
      name: 'Create workout_data metadata index',
      sql: `CREATE INDEX IF NOT EXISTS idx_workout_data_metadata ON workout_data USING GIN (metadata);`
    },
    {
      name: 'Create game_stats user_id index',
      sql: `CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON game_stats(user_id);`
    },
    {
      name: 'Create game_stats points index',
      sql: `CREATE INDEX IF NOT EXISTS idx_game_stats_points ON game_stats(points DESC);`
    },
    {
      name: 'Create game_stats metadata index',
      sql: `CREATE INDEX IF NOT EXISTS idx_game_stats_metadata ON game_stats USING GIN (metadata);`
    }
  ];

  // Connect to the database
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false // Required for Neon PostgreSQL
    }
  });
  
  try {
    console.log('Connecting to Neon PostgreSQL...');
    
    // Test connection
    const client = await pool.connect();
    console.log('Connected to Neon PostgreSQL');
    
    // Execute each statement
    console.log(`Executing ${statements.length} schema operations...`);
    
    for (let i = 0; i < statements.length; i++) {
      const { name, sql } = statements[i];
      try {
        await client.query(sql);
        console.log(`✅ ${i + 1}/${statements.length}: ${name} - Success`);
      } catch (error) {
        console.error(`❌ ${i + 1}/${statements.length}: ${name} - Failed:`, error.message);
      }
    }
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    if (tablesResult.rows.length === 0) {
      console.error('❌ No tables were created.');
    } else {
      console.log('\n✅ Tables created successfully:');
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
    console.log('\nSchema deployment completed');
    client.release();
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    await pool.end();
  }
}

// Execute if run directly
if (require.main === module) {
  createSchema().catch(console.error);
}

module.exports = { createSchema };
