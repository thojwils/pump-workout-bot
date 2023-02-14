const { SlashCommandBuilder } = require("discord.js");
const { Client, GatewayIntentBits } = require("discord.js");
// const client = new Client({ intents: [GatewayIntentBits.Guilds] });
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
    const Client = await MongoClient.connect(url, {
      useUnifiedTopology: true,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 3000,
    });
    const db = mongoClient.db(dbName);
    const collection = db.collection(collectionName);

    const workoutData = { date, username, type };
    await collection.insertOne(workoutData);
    console.log(`Data added: ${JSON.stringify(workoutData)}`);
  } catch (error) {
    console.error(error);
    if (error.name === "MongoTimeoutError") {
      console.error("MongoDB connection timed out");
    }
  } finally {
    if (Client) {
      Client.close();
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

    // Bot response message cases
    let replyMessage;
    switch (type) {
      case "full_body":
        replyMessage = `@${username} did a full body workout! 🏋️`;
        break;
      case "upper_body":
        replyMessage = `@${username} did an upper body workout! 💪`;
        break;
      case "lower_body":
        replyMessage = `@${username} did a lower body workout! 🍗`;
        break;
      case "cardio":
        replyMessage = `@${username} did some cardio! 🏃‍♀️`;
        break;
      case "yoga":
        replyMessage = `@${username} did some yoga! 🧘‍♀️`;
        break;
      case "stretch":
        replyMessage = `@${username} stretched! 🦒`;
        break;
      case "rest":
        replyMessage = `@${username} took a rest day! 💤`;
        break;
      default:
        replyMessage = `@${username} did something...`;
        break;
    }
    // Perform the discord API call and MongoDB insert asynchronously
    await Promise.all([
      interaction.reply(replyMessage),
      saveWorkoutData(username, date, type),
    ]);
  },
};
