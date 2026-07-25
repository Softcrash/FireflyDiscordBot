const { ChannelType } = require('discord.js');
const { resolveExecutor, hasViewAuditLog } = require('./auditResolver');
const { getFilter } = require('./logFilter');

const CHANNEL_TYPE_NAMES = {
  [ChannelType.GuildText]: 'Textkanal',
  [ChannelType.GuildVoice]: 'Sprachkanal',
  [ChannelType.GuildCategory]: 'Kategorie',
  [ChannelType.GuildAnnouncement]: 'Ankündigungskanal',
  [ChannelType.AnnouncementThread]: 'Ankündigungs-Thread',
  [ChannelType.PublicThread]: 'Öffentlicher Thread',
  [ChannelType.PrivateThread]: 'Privater Thread',
  [ChannelType.GuildStageVoice]: 'Stage-Kanal',
  [ChannelType.GuildForum]: 'Forum',
  [ChannelType.GuildMedia]: 'Medienkanal',
};

function channelTypeName(type) {
  return CHANNEL_TYPE_NAMES[type] ?? `Typ ${type}`;
}

/**
 * Executor-Auflösung als fertiges Embed-Feld.
 * types: einzelner AuditLogEvent-Typ oder Array (wird der Reihe nach
 * probiert — wait nur beim ersten Versuch, Puffer-Suche ist gratis).
 * Ohne ViewAuditLog: leeres fields-Array — nichts behaupten.
 * → { fields, reason, executor, entry }
 */
async function executorInfo(
  guild,
  { types, targetId = null, extraMatch = null, wait = 800, label = '👮 Ausgeführt von' } = {}
) {
  if (!hasViewAuditLog(guild)) return { fields: [], reason: null, executor: null, entry: null };

  const list = Array.isArray(types) ? types : [types];
  let resolved = null;
  for (let i = 0; i < list.length && !resolved; i++) {
    resolved = await resolveExecutor(guild, {
      type: list[i],
      targetId,
      extraMatch,
      wait: i === 0 ? wait : 0,
    });
  }

  if (!resolved?.executor) {
    return {
      fields: [{ name: label, value: '`unbekannt` *(kein Audit-Log-Eintrag gefunden)*' }],
      reason: null,
      executor: null,
      entry: resolved?.entry ?? null,
    };
  }
  return {
    fields: [
      { name: label, value: `${resolved.executor} (\`${resolved.executor.id}\`) — laut Audit-Log` },
    ],
    reason: resolved.reason ?? null,
    executor: resolved.executor,
    entry: resolved.entry,
  };
}

/** true = Log unterdrücken (Bot-Executor bei logBots: false). */
function skipBotExecutor(guildId, executor) {
  if (!executor?.bot) return false;
  return !getFilter(guildId, 'server').logBots;
}

module.exports = { channelTypeName, executorInfo, skipBotExecutor };