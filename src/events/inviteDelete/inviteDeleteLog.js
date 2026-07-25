const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { resolveExecutor, hasViewAuditLog } = require('../../utils/moderation/logging/auditResolver');
const { skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, invite) => {
  const guild = invite.guild ? client.guilds.cache.get(invite.guild.id) : null;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'invite', { channelId: invite.channelId })) return;

  const fields = [
    { name: 'Code', value: `\`discord.gg/${invite.code}\``, inline: true },
    { name: 'Ziel-Channel', value: invite.channelId ? `<#${invite.channelId}>` : '`—`', inline: true },
  ];

  if (hasViewAuditLog(guild)) {
    const resolved = await resolveExecutor(guild, {
      type: AuditLogEvent.InviteDelete,
      extraMatch: (e) =>
        e.changes?.some((c) => c.key === 'code' && (c.old === invite.code || c.new === invite.code)),
      wait: 800,
    });
    if (skipBotExecutor(guild.id, resolved?.executor)) return;
    fields.push({
      name: '👮 Gelöscht von',
      value: resolved?.executor
        ? `${resolved.executor} (\`${resolved.executor.id}\`) — laut Audit-Log`
        : '`—` *(kein Audit-Eintrag — vermutlich abgelaufen oder aufgebraucht)*',
    });
  }

  const embed = buildLogEmbed({
    action: 'delete',
    emoji: '✉️',
    title: 'Einladung gelöscht',
    fields,
    footerId: invite.code,
  });
  await logEvent(guild, 'server', embed);
};