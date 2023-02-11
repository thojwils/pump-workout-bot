const { Client, GatewayIntentBits, MessageEmbed } = require("discord.js");
const MongoClient = require("mongodb").MongoClient;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const url =
  "mongodb+srv://thojwils:hVH3z4YMTyBldh6t@cluster0.ie3kmmd.mongodb.net/test";
const dbName = "workouts";
const collectionName = "workoutData";
const channelName = "🏋🏽-health-fitness";

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Schedule a job to run at the end of each day to fetch the workout data and send a message to the channel
  scheduleJob("0 0 0 * * *", async () => {
    const date = new Date();
    const workoutData = await fetchWorkoutDataForDay(date);

    if (workoutData.length > 0) {
      const messageEmbed = new MessageEmbed()
        .setTitle("Workout Log")
        .setColor("#0099ff")
        .setDescription(
          `Here are the users who worked out on ${date.toDateString()}:`
        );

      workoutData.forEach((workout) => {
        messageEmbed.addField(
          workout.username,
          workout.date.toLocaleTimeString()
        );
      });

      const channel = client.channels.cache.find(
        (channel) => channel.name === channelName
      );
      channel.send({ embeds: [messageEmbed] });
    }
  });
});

const fetchWorkoutDataForDay = async (date) => {
  let mongoClient;
  const workoutData = [];

  try {
    mongoClient = await MongoClient.connect(url, { useUnifiedTopology: true });
    const db = mongoClient.db(dbName);
    const collection = db.collection(collectionName);

    const res = await collection
      .find({
        date: {
          $gte: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0,
            0,
            0
          ),
          $lt: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() + 1,
            0,
            0,
            0
          ),
        },
      })
      .toArray();

    res.forEach((workout) => {
      workoutData.push(workout);
    });
  } catch (error) {
    console.error(error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }

  return workoutData;
};

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "workedOut") {
    const workoutData = await fetchWorkoutDataForDay(new Date());
    if (workoutData.length > 0) {
      const messageEmbed = new MessageEmbed()
        .setTitle("Workout Log")
        .setColor("#0099ff")
        .setDescription(
          `Here are the users who worked out on ${new Date().toDateString()}:`
        );

      workoutData.forEach((workout) => {
        messageEmbed.addField(
          workout.username,
          workout.date.toLocaleTimeString()
        );
      });

      await interaction.reply({ embeds: [messageEmbed] });
    } else {
      await interaction.reply("No one worked out today!");
    }
  }
});
