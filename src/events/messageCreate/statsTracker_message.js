// FILE: src/events/messageCreate/statsTracker.js
const { MessageStat } = require('../../database/registry');

module.exports = async (client, message) => {
  try {
    // Bots ignorieren, keine DMs
    if (!message.guild || message.author.bot) return;

    const guildId   = message.guild.id;
    const userId    = message.author.id;
    const channelId = message.channel.id;
    const date      = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Upsert: existierenden Eintrag um 1 erhöhen oder neu anlegen
    const [row, created] = await MessageStat.findOrCreate({
      where: { guildId, userId, channelId, date },
      defaults: { count: 1 },
    });

    if (!created) {
      row.count += 1;
      await row.save();
    }
  } catch (err) {
    console.error('[statsTracker/message] Fehler:', err);
  }
};