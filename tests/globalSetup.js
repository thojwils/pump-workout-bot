// tests/globalSetup.js
const dotenv = require('dotenv');
const path = require('path');

module.exports = async () => {
  // Load the .env file from the project root
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
};