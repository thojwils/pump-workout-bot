const { close } = require('../db/postgres');

module.exports = async () => {
  console.log('Closing database connection pool...');
  await close();
  console.log('Database connection pool closed.');
};