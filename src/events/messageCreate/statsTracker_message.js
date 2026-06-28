const { MessageStat } = require('../../database/registry');

module.exports = async (client, message) => {
  try {
    if (!message.guild || message.author.bot) return;

    const guildId   = message.guild.id;
    const userId    = message.author.id;
    const channelId = message.channel.id;
    const date      = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [, created] = await MessageStat.findOrCreate({
      where:    { guildId, userId, channelId, date },
      defaults: { guildId, userId, channelId, date, count: 1 },
    });

    if (!created) {
      await MessageStat.increment('count', {
        by: 1,
        where: { guildId, userId, channelId, date },
      });
    }
  } catch (err) {
    console.error('[statsTracker/message] Fehler:', err);
  }
};