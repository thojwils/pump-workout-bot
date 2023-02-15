const { SlashCommandBuilder } = require("discord.js");
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const MongoClient = require("mongodb").MongoClient;

const url =
  "mongodb+srv://thojwils:hVH3z4YMTyBldh6t@cluster0.ie3kmmd.mongodb.net/test";
const dbName = "workouts";
const collectionName = "workoutData";

const pumpData = new SlashCommandBuilder()
  .setName("pump")
  .setDescription("Saves a pump with type")
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("The type of workout")
      .setRequired(true)
      .addChoices(
        { name: "Full body", value: "full_body" },
        { name: "Upper body", value: "upper_body" },
        { name: "Lower body", value: "lower_body" },
        { name: "Cardio", value: "cardio" },
        { name: "Yoga", value: "yoga" },
        { name: "Stretch", value: "stretch" },
        { name: "Rest", value: "rest" }
      )
  );

const saveWorkoutData = async (username, date, type) => {
  try {
    const client = await MongoClient.connect(url, {
      useUnifiedTopology: true,
    });
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.createIndex({ username: 1, date: -1 }, { unique: true });

    const workoutData = { date, username, type };
    const existingData = await collection.findOne({
      username: username,
      date: {
        $gt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        $lt: new Date(Date.now()),
      },
    });
    if (!existingData) {
      await collection.insertOne(workoutData);
      console.log(`Data added: ${JSON.stringify(workoutData)}`);
    } else {
      console.log(
        `Data already exists for this user today: ${JSON.stringify(
          existingData
        )}`
      );
    }
  } catch (error) {
    console.error(error);
  } finally {
    if (client) {
      client.close();
    }
  }
};

const processedInteractions = new Set();

const markInteractionAsProcessed = (interaction) => {
  processedInteractions.add(interaction.id);
  setTimeout(() => {
    processedInteractions.delete(interaction.id);
  }, 1000 * 60 * 60 * 24); // Remove from set after 24 hours
};

module.exports = {
  data: pumpData,
  async execute(interaction) {
    // Check if the interaction has already been replied to or deferred
    if (interaction.replied || processedInteractions.has(interaction.id)) {
      return;
    }

    // Check that interaction contains a user property
    if (!interaction.user) {
      await interaction.reply(
        "Error: interaction does not contain user information."
      );
      return;
    }

    // Extract user information from interaction
    const username = interaction.user.username || "Unknown";
    const date = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    });
    const type = interaction.options.getString("type");

    // Perform the discord API call and MongoDB insert asynchronously
    await interaction.deferReply();
    await Promise.all([
      interaction.editReply(`Good Pump <@${username}>! ✅`),
      saveWorkoutData(username, date, type),
    ]);
    markInteractionAsProcessed(interaction);
  },
};
