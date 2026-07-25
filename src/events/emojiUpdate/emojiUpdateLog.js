const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, oldEmoji, newEmoji) => {
  const guild = newEmoji.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (oldEmoji.name === newEmoji.name) return;
  if (!shouldLog(guild.id, 'server', 'emoji', {})) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.EmojiUpdate,
    targetId: newEmoji.id,
    label: '👮 Geändert von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '😀',
    title: 'Emoji umbenannt',
    description: `${newEmoji} \`:${oldEmoji.name}:\` → \`:${newEmoji.name}:\``,
    reason: info.reason,
    fields: info.fields,
    footerId: newEmoji.id,
  });
  await logEvent(guild, 'server', embed);
};