const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const moment = require("moment");
const { MongoClient } = require("mongodb");

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

    try {
      const client = new MongoClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection("workoutData");

      const workouts = await collection
        .find({ username })
        .sort({ date: 1 })
        .toArray();
      if (workouts.length > 0) {
        streak++;
        const today = moment().startOf("day");
        let lastWorkoutDate = moment(
          workouts[0].date,
          "M/D/YYYY, h:mm:ss A"
        ).startOf("day");
        for (let i = 1; i < workouts.length; i++) {
          const workoutDate = moment(
            workouts[i].date,
            "M/D/YYYY, h:mm:ss A"
          ).startOf("day");
          const diffDays = workoutDate.diff(lastWorkoutDate, "days");
          if (diffDays === 1) {
            streak++;
            console.log(streak);
          } else {
            break;
          }
          lastWorkoutDate = workoutDate;
        }
        if (streak === 0) {
          // If there was a gap between the last workout and today, the streak is broken
          const diffDays = today.diff(lastWorkoutDate, "days");
          if (diffDays === 1) {
            streak = 1;
          }
        }
      }

      // set fire
      let fire = `🔥`;
      let fireStreak = "";

      for (let i = 0; i < streak; i++) {
        fireStreak += fire;
      }

      const embedBuilder = new EmbedBuilder()
        .setTitle("Workout Streak")
        .setColor("#0099ff")
        .setDescription(
          `Your current workout streak is ${streak} day${
            streak === 1 ? "" : "s"
          }. ${fireStreak}`
        );
      await interaction.reply({ embeds: [embedBuilder] });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "An error occurred while executing the command.",
        ephemeral: true,
      });
    }
  },
};
