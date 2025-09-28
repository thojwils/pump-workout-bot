# PumpBot - Discord Workout Bot

PumpBot is a Discord bot designed to help users track their workouts, get workout routines, and engage with fitness challenges in a fun, interactive way.

## Features

- **Workout Streak Tracking**: Track consecutive days of working out
- **Predefined Workout Routines**: Get workout routines for different body parts
- **Workout Challenge Game**: Engage with quick fitness challenges and earn points
- **Leaderboard**: Compare your workout progress with other users

## Setup Instructions

### Prerequisites

- Node.js v18.14.x or higher
- PostgreSQL database
- Discord Bot Token

### Database Setup

1. Install PostgreSQL if you don't already have it
2. Create a new database:
   ```sql
   CREATE DATABASE pumpbot;
   ```
3. Run the schema file to set up tables:
   ```
   psql -U your_username -d pumpbot -f db/schema.sql
   ```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_APP_CLIENT_ID=your_discord_app_client_id_here
DISCORD_APP_GUILD_ID=your_discord_server_id_here

# PostgreSQL Configuration
DATABASE_URL=postgres://username:password@localhost:5432/pumpbot

# Server Configuration (for hosting)
PORT=3000
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Register slash commands:
   ```
   node deploy-commands.js
   ```
4. Start the bot:
   ```
   npm start
   ```

## Testing

The project includes extensive tests for both database operations and command handlers:

```bash
# Run all tests
npm test

# Run only database tests
npm run test:db

# Run only command tests
npm run test:commands
```

## Technical Details

### PostgreSQL Schema

The bot uses two main tables:

- `workout_data`: Stores workout records for streak tracking
- `game_stats`: Stores game progress and points for the workout challenge game

Both tables utilize JSONB fields for flexible data storage.

### Architecture

- Commands are organized in the `/commands` directory
- Database operations are abstracted in `/db/postgres.js`
- Modern Discord.js v14 interaction patterns are used
- Component interactions (buttons, select menus) are handled via handlers exported by each command

## Deployment

The bot includes a basic Express server to facilitate deployment on platforms like Heroku. The `Procfile` is already configured for Heroku deployment.

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Security

- All sensitive information is stored in environment variables
- Database connections use best practices for security
- No hardcoded credentials in the codebase

## Contributing

Feel free to submit issues or pull requests to help improve PumpBot!
