const { Guild } = require('../../database/registry');

module.exports = async (client, guild) => {
  try {
    await Guild.upsert({ id: guild.id, name: guild.name });
    await GuildSettings.findOrCreate({ where: { guildId: guild.id } });
    console.log(`[guildCreate] Neuer Server: ${guild.name} (${guild.id})`);
  } catch (err) {
    console.error('[guildCreate] DB-Fehler:', err);
  }
};