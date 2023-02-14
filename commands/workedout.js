const { SlashCommandBuilder } = require("discord.js");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const MongoClient = require("mongodb").MongoClient;
// const client = new Client({ intents: [GatewayIntentBits.Guilds] });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("streak")
    .setDescription("Counts how many consecutive days you have worked out"),
  async execute(interaction) {
    const username = interaction.user.username;
    const url =
      "mongodb+srv://thojwils:hVH3z4YMTyBldh6t@cluster0.ie3kmmd.mongodb.net/test";
    const dbName = "workouts";
    let streak = 0;
    let mongoClient;

    try {
      mongoClient = await MongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      const db = mongoClient.db(dbName);
      const collection = db.collection("workoutData");

      const latestWorkout = await collection.findOne(
        { username },
        { sort: { date: -1 } }
      );

      if (latestWorkout) {
        const today = new Date();
        const lastWorkoutDate = new Date(latestWorkout.date);
        const diffTime = Math.abs(today - lastWorkoutDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          const previousWorkout = await collection.findOne(
            { username, date: { $lt: latestWorkout.date } },
            { sort: { date: -1 } }
          );

          if (previousWorkout) {
            const previousWorkoutDate = new Date(previousWorkout.date);
            const diffTime2 = Math.abs(lastWorkoutDate - previousWorkoutDate);
            const diffDays2 = Math.ceil(diffTime2 / (1000 * 60 * 60 * 24));

            if (diffDays2 === 1) {
              streak = previousWorkout.streak + 1;
            } else {
              streak = 1;
            }
          } else {
            streak = 1;
          }
        }
      }

      const embedBuilder = new EmbedBuilder()
        .setTitle("Workout Streak")
        .setColor("#0099ff")
        .setDescription(
          `Your current workout streak is ${streak} day${
            streak === 1 ? "" : "s"
          }.`
        );
      await interaction.reply({ embeds: [embedBuilder] });
    } catch (error) {
      console.error(error);
    } finally {
      if (mongoClient) {
        await mongoClient.close();
      }
    }
  },
};
