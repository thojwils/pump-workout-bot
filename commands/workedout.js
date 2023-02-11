const { SlashCommandBuilder } = require("discord.js");
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const MongoClient = require("mongodb").MongoClient;
// const { Chart } = require("chart.js");
// const Canvas = require("canvas");

const url =
  "mongodb+srv://thojwils:hVH3z4YMTyBldh6t@cluster0.ie3kmmd.mongodb.net/test";
const dbName = "workouts";

const fetchWorkoutDataForUser = async (username) => {
  let mongoClient;
  const workouts = [];
  try {
    mongoClient = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = mongoClient.db(dbName);
    const collection = db.collection("workoutData");

    // retrieve list of workouts for the given user in the current month
    const currentMonth = new Date().getMonth();
    const res = await collection
      .find({
        username: username,
        date: {
          $gte: new Date(new Date().setMonth(currentMonth, 1)),
          $lt: new Date(new Date().setMonth(currentMonth + 1, 1)),
        },
      })
      .toArray();

    res.forEach((workout) => {
      workouts.push(workout);
    });
  } catch (error) {
    console.error(error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
  return workouts;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("show-workouts")
    .setDescription("Shows user's workout data"),
  async execute(interaction) {
    const username = interaction.user.username;

    // Fetch user's workout data from database
    const workoutData = await fetchWorkoutDataForUser(username);

    // Create the chart using Chart.js
    // const canvas = Canvas.createCanvas(700, 500);
    // const ctx = canvas.getContext("2d");
    // const chart = new Chart(ctx, {
    //   type: "bar",
    //   data: {
    //     labels: workoutData.map((entry) => entry.date),
    //     datasets: [
    //       {
    //         label: "Workouts",
    //         data: workoutData.map((entry) => entry.value),
    //         backgroundColor: "rgba(54, 162, 235, 0.2)",
    //         borderColor: "rgba(54, 162, 235, 1)",
    //         borderWidth: 1,
    //       },
    //     ],
    //   },
    //   options: {
    //     scales: {
    //       yAxes: [
    //         {
    //           ticks: {
    //             beginAtZero: true,
    //           },
    //         },
    //       ],
    //     },
    //   },
    // });

    // Send the chart as a message
    interaction.respond(`Here's your workout data for the current month:`);
    // interaction.respond({ files: [chart.toBase64Image()] });
  },
};
