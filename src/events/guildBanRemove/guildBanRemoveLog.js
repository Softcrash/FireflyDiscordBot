const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const {
  resolveExecutor,
  hasViewAuditLog,
} = require('../../utils/moderation/logging/auditResolver');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, ban) => {
  const guild = ban.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;

  const user = ban.user;
  if (
    !shouldLog(guild.id, 'user', 'banRemove', {
      user,
      isBot: user?.bot ?? false,
    })
  ) {
    return;
  }

  const fields = [];
  if (hasViewAuditLog(guild)) {
    const resolved = await resolveExecutor(guild, {
      type: AuditLogEvent.MemberBanRemove,
      targetId: user.id,
      wait: 1000,
    });
    fields.push({
      name: '🕊️ Entbannt von',
      value: resolved?.executor
        ? `${resolved.executor} (\`${resolved.executor.id}\`) — laut Audit-Log`
        : '`unbekannt` *(kein Audit-Log-Eintrag gefunden)*',
    });
    if (resolved?.reason) fields.push({ name: '📝 Grund', value: resolved.reason });
  }

  const embed = buildLogEmbed({
    action: 'create',
    emoji: '🕊️',
    title: 'Mitglied entbannt',
    target: user,
    fields,
    footerId: user.id,
  });

  await logEvent(guild, 'user', embed);
};