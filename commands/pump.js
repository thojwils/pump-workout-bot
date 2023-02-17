const { SlashCommandBuilder } = require("discord.js");
const { MongoClient } = require("mongodb");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pump")
    .setDescription("Saves a pump")
    .addStringOption((option) =>
      option
        .setName("workout_type")
        .setDescription("Type of workout")
        .setRequired(true)
        .addChoices(
          { name: "Full Body", value: "full_body" },
          { name: "Upper Body", value: "upper_body" },
          { name: "Lower Body", value: "lower_body" },
          { name: "Yoga", value: "yoga" },
          { name: "Cardio", value: "cardio" },
          { name: "Rest", value: "rest" }
        )
    ),
  async execute(interaction) {
    const workoutType = interaction.options.getString("workout_type");
    const username = interaction.user.username;
    const date = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    });

    // Save data to MongoDB
    const uri =
      process.env.MONGODB_URI ||
      (() => {
        try {
          return JSON.parse(fs.readFileSync("./config.json", "utf-8")).mongodb;
        } catch (error) {
          return undefined;
        }
      })();
    console.log(uri);
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    try {
      await client.connect();
      const database = client.db("workouts");
      const collection = database.collection("workoutData");

      const today = new Date().setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const filter = {
        username,
        date: { $gte: today, $lt: tomorrow },
      };

      const update = {
        $set: {
          workoutType,
          date,
        },
      };

      const options = { upsert: true };

      const result = await collection.updateOne(filter, update, options);

      if (result.modifiedCount === 1) {
        console.log(
          `Workout data updated for user ${username}: ${workoutType} on ${date}`
        );
      } else if (result.upsertedCount === 1) {
        console.log(
          `Workout data saved for user ${username}: ${workoutType} on ${date}`
        );
      } else {
        console.error(`Unexpected result from updateOne: ${result}`);
      }

      await client.close();
    } catch (err) {
      console.error(err);
      await interaction.reply(
        "There was an error saving your pump. Please try again later."
      );
      return;
    }

    // Reply based on workout type
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
    await interaction.reply(`${reply} <@${interaction.user.id}>`);
  },
};
