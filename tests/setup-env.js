// tests/setup-env.js
const dotenv = require('dotenv');
const path = require('path');

// Construct the path to the .env file in the project root
const envPath = path.resolve(__dirname, '../.env');

// Load the .env file
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('!!! FAILED TO LOAD .env FILE IN JEST SETUP !!!');
  throw result.error;
}

console.log(`\nJest setup: Successfully loaded .env file from ${envPath}`);
console.log(`Jest setup: TEST_DATABASE_URL is ${process.env.TEST_DATABASE_URL ? 'DEFINED' : 'UNDEFINED'}`);