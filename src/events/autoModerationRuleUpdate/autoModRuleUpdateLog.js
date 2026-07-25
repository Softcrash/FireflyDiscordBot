const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, oldRule, newRule) => {
  const guild = newRule.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'autoMod', {})) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.AutoModerationRuleUpdate,
    targetId: newRule.id,
    label: '👮 Geändert von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const nameChange =
    oldRule && oldRule.name !== newRule.name ? `\`${oldRule.name}\` → \`${newRule.name}\`` : null;

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '🛡️',
    title: 'AutoMod-Regel geändert',
    target: { name: newRule.name, id: newRule.id },
    reason: info.reason,
    fields: [
      ...(nameChange ? [{ name: 'Name', value: nameChange }] : []),
      {
        name: 'Status',
        value: newRule.enabled ? '`aktiv`' : '`deaktiviert`',
        inline: true,
      },
      ...info.fields,
    ],
    footerId: newRule.id,
  });
  await logEvent(guild, 'server', embed);
};