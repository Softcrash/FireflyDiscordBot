const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { channelTypeName, executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, channel) => {
  const guild = channel.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'channelCreate', { channelId: channel.id, parentId: channel.parentId })) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.ChannelCreate,
    targetId: channel.id,
    label: '👮 Erstellt von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const embed = buildLogEmbed({
    action: 'create',
    emoji: '📗',
    title: 'Channel erstellt',
    target: channel,
    reason: info.reason,
    fields: [
      { name: 'Typ', value: `\`${channelTypeName(channel.type)}\``, inline: true },
      { name: 'Kategorie', value: channel.parent ? `\`${channel.parent.name}\`` : '`—`', inline: true },
      ...info.fields,
    ],
    footerId: channel.id,
  });
  await logEvent(guild, 'server', embed);
};