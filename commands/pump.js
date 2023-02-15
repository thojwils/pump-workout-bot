const { SlashCommandBuilder } = require("discord.js");
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pump")
    .setDescription("Saves a pump"),
  async execute(interaction) {
    await interaction.reply("Good Pump! ✅");
    const MongoClient = require("mongodb").MongoClient;

    const url =
      "mongodb+srv://thojwils:hVH3z4YMTyBldh6t@cluster0.ie3kmmd.mongodb.net/test";
    const dbName = "workouts";

    let date;
    const username = interaction.user.username;
    console.log(username);
    if (username) {
      let mongoClient;

      MongoClient.connect(url, { useUnifiedTopology: true })
        .then((_client) => {
          console.log("MongoDB connection started");
          mongoClient = _client;
          const db = mongoClient.db(dbName);
          const collection = db.collection("workoutData");
          // insert date
          date = new Date().toLocaleString("en-US", {
            timeZone: "America/New_York",
          });

          return collection.insertOne({
            date: date,
            username: username,
          });
        })
        .then((res) => {
          console.log(`Date added: ${date}`);
          return mongoClient.close();
        })
        .then(() => {
          console.log("MongoDB connection closed");
        })
        .catch((err) => {
          console.error(err);
          return mongoClient.close();
        });
    } else {
      username = "Unknown";
    }
  },
};
