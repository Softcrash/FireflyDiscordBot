const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, rule) => {
  const guild = rule.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'autoMod', {})) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.AutoModerationRuleDelete,
    targetId: rule.id,
    label: '👮 Gelöscht von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const embed = buildLogEmbed({
    action: 'delete',
    emoji: '🛡️',
    title: 'AutoMod-Regel gelöscht',
    target: { name: rule.name, id: rule.id },
    reason: info.reason,
    fields: info.fields,
    footerId: rule.id,
  });
  await logEvent(guild, 'server', embed);
};