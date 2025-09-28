const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, Events } = require("discord.js");
const dotenv = require("dotenv");
const db = require('./db/postgres');
const databaseService = require('./commands/rally/lib/DatabaseService');

dotenv.config();

async function initializeApp() {
    await db.connect();
    await databaseService.createSchemaIfNeeded();
}

initializeApp();

const discordBotToken = process.env.DISCORD_BOT_TOKEN;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function getFilesRecursively(dir, ext) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files = files.concat(getFilesRecursively(fullPath, ext));
        } else if (item.isFile() && item.name.endsWith(ext)) {
            files.push(fullPath);
        }
    }
    return files;
}

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = getFilesRecursively(commandsPath, '.js');

for (const filePath of commandFiles) {
    try {
        const command = require(filePath);
        if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            console.log(`[INFO] Loaded command: ${command.data.name}`);
        }
    } catch (error) {
        console.error(`[ERROR] Could not load command at ${filePath}:`, error);
    }
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            await interaction.reply({ content: "There was an error executing this command.", ephemeral: true });
            return;
        }
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
            await interaction[replyMethod]({ content: "There was an error executing this command.", ephemeral: true });
        }
    } else if (interaction.isButton()) {
        // Handle button interactions globally
        const commandName = interaction.customId.split('_')[0];
        const command = client.commands.get(commandName);
        if (command && command.handleButton) {
            try {
                await command.handleButton(interaction);
            } catch (error) {
                console.error(`Error handling button for ${commandName}:`, error);
            }
        }
    }
});

client.on(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(discordBotToken);