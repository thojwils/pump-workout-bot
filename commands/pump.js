const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const moment = require("moment");
const db = require("../db/postgres");
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pump")
    .setDescription("Track your workout and view your streak")
    .addStringOption(option =>
      option.setName('workout_type')
        .setDescription('The type of workout you did')
        .setRequired(true)
        .addChoices(
          { name: "Full Body", value: "full_body" },
          { name: "Upper Body", value: "upper_body" },
          { name: "Lower Body", value: "lower_body" },
          { name: "Yoga", value: "yoga" },
          { name: "Cardio", value: "cardio" },
          { name: "Rest Day", value: "rest" }
        )
    ),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const username = interaction.user.username;
    const userId = interaction.user.id;
    const workoutType = interaction.options.getString("workout_type");
    let streak = 0;

    try {
      // Record the new workout
      const now = new Date();
      await db.insertWorkout({
        username,
        userId,
        workoutType,
        date: now.toISOString()
      });

      // Get user's workouts sorted by date (newest first)
      const workouts = await db.getUserWorkouts(username, {
        sort: 'desc'
      });
      
      const workoutDays = new Set(workouts.map(w => moment(w.date).format('YYYY-MM-DD')));
      
      if (workoutType !== 'rest') {
        workoutDays.add(moment().format('YYYY-MM-DD'));
      }

      streak = 0;
      const checkDate = moment().startOf('day');

      while (workoutDays.has(checkDate.format('YYYY-MM-DD'))) {
        streak++;
        checkDate.subtract(1, 'days');
      }

      // Generate fire emojis based on streak
      let fire = `🔥`;
      let fireStreak = "";
      for (let i = 0; i < streak; i++) {
        fireStreak += fire;
      }

      // Generate workout type response
      let reply;
      switch (workoutType) {
        case "full_body":
          reply = "Good Pump! 🏋️";
          break;
        case "upper_body":
          reply = "Good Pump! 💪";
          break;
        case "lower_body":
          reply = "Never Skips It 🍗";
          break;
        case "yoga":
          reply = "Namaste! 🧘‍♂️";
          break;
        case "cardio":
          reply = "We got a runner! 🏃‍♂️";
          break;
        case "rest":
          reply = "Shhh Jerry is sleeping 😴";
          break;
        default:
          reply = "Good workout! ✅";
      }

      // Create and send embed
      const embedBuilder = new EmbedBuilder()
        .setTitle("Workout Streak")
        .setColor("#0099ff")
        .setDescription(
          `Your current workout streak is ${streak} day${
            streak === 1 ? "" : "s"
          }. ${fireStreak}`
        );
      
      // Send the response with both the embed and the workout message
      await interaction.editReply({
        content: `${reply} <@${interaction.user.id}>`,
        embeds: [embedBuilder]
      });
      
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "An error occurred while executing the command.",
        ephemeral: true,
      });
    }
  }
};
