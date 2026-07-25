const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, oldSticker, newSticker) => {
  const guild = newSticker.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (oldSticker.name === newSticker.name && oldSticker.description === newSticker.description) return;
  if (!shouldLog(guild.id, 'server', 'sticker', {})) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.StickerUpdate,
    targetId: newSticker.id,
    label: '👮 Geändert von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '🖼️',
    title: 'Sticker geändert',
    description: `\`${oldSticker.name}\` → \`${newSticker.name}\``,
    reason: info.reason,
    fields: info.fields,
    footerId: newSticker.id,
  });
  await logEvent(guild, 'server', embed);
};