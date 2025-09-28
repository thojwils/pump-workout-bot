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

async function testConnection() {
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
    console.log('✅ Connection successful!');
    
    // Test query
    const res = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query successful!');
    console.log(`Current database time: ${res.rows[0].current_time}`);
    
    // List tables
    console.log('\nChecking database tables...');
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    if (tableRes.rows.length === 0) {
      console.log('No tables found. You may need to deploy the schema first.');
    } else {
      console.log('Available tables:');
      tableRes.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.table_name}`);
      });
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.error('\nTIP: Check that your DATABASE_URL is correct in your .env file');
      console.error('Make sure you\'re using the connection string from the Neon dashboard.');
    }
  } finally {
    await pool.end();
  }
}

// Execute if run directly
if (require.main === module) {
  testConnection().catch(console.error);
}

module.exports = { testConnection };
