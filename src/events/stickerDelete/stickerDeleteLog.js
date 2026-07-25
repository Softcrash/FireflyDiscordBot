const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, sticker) => {
  const guild = sticker.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'sticker', {})) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.StickerDelete,
    targetId: sticker.id,
    label: '👮 Gelöscht von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const embed = buildLogEmbed({
    action: 'delete',
    emoji: '🖼️',
    title: 'Sticker entfernt',
    description: `\`${sticker.name}\``,
    reason: info.reason,
    fields: info.fields,
    footerId: sticker.id,
  });
  await logEvent(guild, 'server', embed);
};