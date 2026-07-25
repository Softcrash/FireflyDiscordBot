const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { permName } = require('../../utils/moderation/logging/logDiff');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, role) => {
  const guild = role.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'roleCreate', {})) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.RoleCreate,
    targetId: role.id,
    label: '👮 Erstellt von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const perms = role.permissions.toArray().map(permName);
  const embed = buildLogEmbed({
    action: 'create',
    emoji: '🏷️',
    title: 'Rolle erstellt',
    target: role,
    reason: info.reason,
    fields: [
      { name: 'Farbe', value: `\`${role.hexColor}\``, inline: true },
      { name: 'Rechte', value: perms.length ? perms.join(', ') : '`Keine`' },
      ...info.fields,
    ],
    footerId: role.id,
  });
  await logEvent(guild, 'server', embed);
};