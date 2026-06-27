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

    // Zuerst versuchen den Zähler atomar zu erhöhen (UPDATE ... SET count = count + 1).
    // Das ist race-condition-sicher: die Erhöhung passiert direkt in der DB,
    // es wird nie ein "alter" Wert gelesen und versehentlich überschrieben.
    const [affectedRows] = await MessageStat.increment('count', {
      by: 1,
      where: { guildId, userId, channelId, date },
    });

    // Wenn affectedRows === 0, existierte die Zeile noch nicht → anlegen.
    // findOrCreate kann hier theoretisch ebenfalls doppelt anlegen, wenn zwei
    // Requests gleichzeitig "noch nicht vorhanden" sehen — das fängt der
    // unique Index (guildId, userId, channelId, date) auf der DB-Ebene ab.
    if (affectedRows === 0) {
      try {
        await MessageStat.create({ guildId, userId, channelId, date, count: 1 });
      } catch (err) {
        // Unique-Constraint-Verletzung = paralleler Request hat die Zeile
        // bereits angelegt → einfach nachträglich erhöhen.
        if (err.name === 'SequelizeUniqueConstraintError') {
          await MessageStat.increment('count', {
            by: 1,
            where: { guildId, userId, channelId, date },
          });
        } else {
          throw err;
        }
      }
    }
  } catch (err) {
    console.error('[statsTracker/message] Fehler:', err);
  }
};