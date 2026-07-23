require("dotenv/config");
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const eventHandler = require("./handlers/eventHandler");
const { sequelize } = require("./database/registry");
const { flushAllQueues } = require("./utils/moderation/logging/logManager");

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
    GatewayIntentBits.GuildExpressions,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.GuildMember,
    Partials.User,
    Partials.ThreadMember,
    Partials.Reaction,
  ],
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} empfangen — fahre herunter …`);
  try {
    await Promise.race([
      flushAllQueues(),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch (err) {
    console.error("Queue-Flush beim Shutdown fehlgeschlagen:", err);
  }
  try {
    await client.destroy();
  } catch {}
  process.exit(0);
}
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

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
})();