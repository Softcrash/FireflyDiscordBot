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

  if (ban.partial) {
    ban = (await ban.fetch().catch(() => null)) ?? ban;
  }
  const user = ban.user;

  if (
    !shouldLog(guild.id, 'user', 'banAdd', {
      user,
      isBot: user?.bot ?? false,
    })
  ) {
    return;
  }

  const fields = [];
  let executorField = null;
  let reason = ban.reason ?? null;

  if (hasViewAuditLog(guild)) {
    const resolved = await resolveExecutor(guild, {
      type: AuditLogEvent.MemberBanAdd,
      targetId: user.id,
      wait: 1000,
    });
    if (resolved?.executor) {
      executorField = `${resolved.executor} (\`${resolved.executor.id}\`) — laut Audit-Log`;
      reason = resolved.reason ?? reason;
    } else {
      executorField = '`unbekannt` *(kein Audit-Log-Eintrag gefunden)*';
    }
  }

  if (executorField) fields.push({ name: '🔨 Gebannt von', value: executorField });

  const embed = buildLogEmbed({
    action: 'delete',
    emoji: '🔨',
    title: 'Mitglied gebannt',
    target: user,
    reason,
    fields,
    footerId: user.id,
  });

  await logEvent(guild, 'user', embed);
};