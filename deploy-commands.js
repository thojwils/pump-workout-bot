const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const discordBotToken = process.env.DISCORD_BOT_TOKEN;
const discordAppClientId = process.env.DISCORD_APP_CLIENT_ID;
const discordAppGuildId = process.env.DISCORD_APP_GUILD_ID;

function getFilesRecursively(dir, ext) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        // Skip 'lib' directories - they contain helper files, not commands
        if (item.isDirectory()) {
            if (item.name === 'lib') {
                continue; // Skip lib directories
            }
            files = files.concat(getFilesRecursively(fullPath, ext));
        } else if (item.isFile() && item.name.endsWith(ext)) {
            // Skip files that have 'lib' in their path
            if (fullPath.includes(path.sep + 'lib' + path.sep)) {
                continue;
            }
            files.push(fullPath);
        }
    }
    return files;
}

async function main() {
  if (!discordBotToken || !discordAppClientId || !discordAppGuildId) {
    console.error('Error: Missing required environment variables.');
    process.exit(1);
  }

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = getFilesRecursively(commandsPath, '.js');

  console.log(`Found ${commandFiles.length} command files to register...`);

  for (const filePath of commandFiles) {
    try {
      // Skip any files in lib directories
      if (filePath.includes(path.sep + 'lib' + path.sep)) {
        console.log(`Skipping library file: ${filePath}`);
        continue;
      }
      
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`Adding command: ${command.data.name}`);
      } else {
        console.log(`Command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    } catch (error) {
      console.error(`Error loading command from ${filePath}:`, error);
    }
  }

  if (commands.length === 0) {
    console.warn('No commands found to register!');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(discordBotToken);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    const data = await rest.put(
      Routes.applicationGuildCommands(discordAppClientId, discordAppGuildId),
      { body: commands }
    );
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    console.log('Registered commands:');
    data.forEach(command => console.log(`- ${command.name}`));
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
}

main().catch(error => {
  console.error('Uncaught error:', error);
  process.exit(1);
});