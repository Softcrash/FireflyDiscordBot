const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, role) => {
  const guild = role.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'roleDelete', {})) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.RoleDelete,
    targetId: role.id,
    label: '👮 Gelöscht von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const embed = buildLogEmbed({
    action: 'delete',
    emoji: '🏷️',
    title: 'Rolle gelöscht',
    target: { name: `@${role.name}`, id: role.id },
    reason: info.reason,
    fields: [{ name: 'Farbe', value: `\`${role.hexColor}\``, inline: true }, ...info.fields],
    footerId: role.id,
  });
  await logEvent(guild, 'server', embed);
};