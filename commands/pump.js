const { SlashCommandBuilder } = require("discord.js");
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
        { name: "Strech", value: "strech" },
        { name: "Rest", value: "rest" }
      )
  );

const saveWorkoutData = async (username, date, type) => {
  try {
    const MongoClient = require("mongodb").MongoClient;
    const client = await MongoClient.connect(url, {
      useUnifiedTopology: true,
    });
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Check if the interaction already exists
    const existingInteraction = await collection.findOne({
      username,
      date,
      type,
    });
    if (existingInteraction) {
      console.log(
        `Interaction already exists: ${JSON.stringify(existingInteraction)}`
      );
      return;
    }

    const workoutData = { date, username, type };
    await collection.insertOne(workoutData);
    console.log(`Data added: ${JSON.stringify(workoutData)}`);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) {
      client.close();
    }
  }
};

module.exports = {
  data: pumpData,
  async execute(interaction) {
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
    await Promise.all([
      interaction.reply(`@${username} pumped ${type}! ✅`),
      saveWorkoutData(username, date, type),
    ]);
  },
};
