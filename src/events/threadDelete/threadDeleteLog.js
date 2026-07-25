const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, thread) => {
  const guild = thread.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'thread', { channelId: thread.id, parentId: thread.parentId })) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.ThreadDelete,
    targetId: thread.id,
    label: '👮 Gelöscht von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const embed = buildLogEmbed({
    action: 'delete',
    emoji: '🧵',
    title: 'Thread gelöscht',
    target: { name: `#${thread.name}`, id: thread.id },
    reason: info.reason,
    fields: [
      { name: 'Eltern-Channel', value: thread.parentId ? `<#${thread.parentId}>` : '`—`', inline: true },
      ...info.fields,
    ],
    footerId: thread.id,
  });
  await logEvent(guild, 'server', embed);
};