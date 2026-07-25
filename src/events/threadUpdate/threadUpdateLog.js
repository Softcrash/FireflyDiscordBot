const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { diffSimple, toFields } = require('../../utils/moderation/logging/logDiff');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

const FIELD_MAP = {
  name: 'Name',
  archived: { label: 'Archiviert', format: (v) => (v ? '`Ja`' : '`Nein`') },
  locked: { label: 'Gesperrt', format: (v) => (v ? '`Ja`' : '`Nein`') },
  autoArchiveDuration: { label: 'Auto-Archiv', format: (v) => (v ? `\`${v} min\`` : '`—`') },
  rateLimitPerUser: { label: 'Slowmode', format: (v) => (v ? `\`${v} s\`` : '`aus`') },
};

module.exports = async (client, oldThread, newThread) => {
  const guild = newThread.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'thread', { channelId: newThread.id, parentId: newThread.parentId })) return;

  const changes = diffSimple(oldThread, newThread, FIELD_MAP);
  if (!changes.length) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.ThreadUpdate,
    targetId: newThread.id,
    label: '👮 Geändert von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '🧵',
    title: 'Thread geändert',
    target: newThread,
    reason: info.reason,
    fields: [...toFields(changes), ...info.fields],
    footerId: newThread.id,
  });
  await logEvent(guild, 'server', embed);
};