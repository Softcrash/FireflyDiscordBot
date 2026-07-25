const { LogSetting } = require('../../database/registry');
const { removeGuild: removeLogQueues } = require('../../utils/moderation/logging/logManager');
const { removeGuild: removeLogFilters } = require('../../utils/moderation/logging/logFilter');
const { clearGuild } = require('../../utils/moderation/logging/auditResolver');

module.exports = async (client, guild) => {
  if (!guild?.id) return;
  try {
    await LogSetting.destroy({ where: { guildId: guild.id } });
  } catch (err) {
    console.error('[logging] Cleanup bei guildDelete fehlgeschlagen:', err);
  }
  removeLogQueues(guild.id);
  removeLogFilters(guild.id);
  clearGuild(guild.id);
};