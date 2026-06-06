const { Guild } = require('../../database/registry');

module.exports = async (client) => {
  try {
    await Promise.all(
      client.guilds.cache.map(guild =>
        Guild.upsert({ id: guild.id, name: guild.name })
      )
    );
    console.log(`[ready] ${client.guilds.cache.size} Guilds mit DB synchronisiert`);
  } catch (err) {
    console.error('[ready] Sync-Fehler:', err);
  }
};