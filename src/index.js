require("dotenv/config");
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const eventHandler = require("./handlers/eventHandler");
const { sequelize } = require("./database/registry");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel],
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Datenbank verbunden");
    await sequelize.sync();

    eventHandler(client);
    await client.login(process.env.TOKEN);
  } catch (err) {
    console.error("❌ Start fehlgeschlagen:", err);
    process.exit(1);
  }
});