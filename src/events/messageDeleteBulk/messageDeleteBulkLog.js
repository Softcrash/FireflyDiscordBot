const { EmbedBuilder } = require('discord.js');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { COLORS } = require('../../utils/moderation/logging/logConstants');

module.exports = async (client, messages, channel) => {
  const guild = channel?.guild ?? messages.first()?.guild;
  if (!guild) return;

  const channelId = channel?.id ?? messages.first()?.channelId;

  const embed = new EmbedBuilder()
    .setColor(COLORS.delete)
    .setTitle('🧹 Massenlöschung')
    .setDescription(`**${messages.size}** Nachrichten wurden in <#${channelId}> gelöscht.`)
    .setTimestamp();

  await logEvent(guild, 'message', embed, { username: 'Massenlöschung' });
};