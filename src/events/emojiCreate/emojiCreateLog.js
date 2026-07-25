const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, emoji) => {
  const guild = emoji.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'emoji', {})) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.EmojiCreate,
    targetId: emoji.id,
    label: '👮 Hochgeladen von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const embed = buildLogEmbed({
    action: 'create',
    emoji: '😀',
    title: 'Emoji hinzugefügt',
    description: `${emoji} \`:${emoji.name}:\` · [Bild](${emoji.imageURL()})`,
    reason: info.reason,
    fields: info.fields,
    footerId: emoji.id,
  });
  await logEvent(guild, 'server', embed);
};