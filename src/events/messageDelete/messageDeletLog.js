const { EmbedBuilder } = require('discord.js');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { COLORS } = require('../../utils/moderation/logging/logConstants');

module.exports = async (client, message) => {
  // Eine gelöschte, nicht gecachte Nachricht (partial) liefert nur IDs —
  // ein fetch() würde 404 liefern (sie ist ja weg), daher kein Nachladen.
  const guild = message.guild;
  if (!guild) return;

  if (message.author?.bot || message.webhookId) return;

  const author = message.author;
  const content = message.content?.length
    ? message.content.slice(0, 1000)
    : '`— kein Textinhalt / nicht im Cache —`';

  const embed = new EmbedBuilder()
    .setColor(COLORS.delete)
    .setTitle('🗑️ Nachricht gelöscht')
    .setDescription(
      `**Autor:** ${author ? `${author} (\`${author.id}\`)` : '`unbekannt`'}\n` +
        `**Kanal:** <#${message.channelId}>`
    )
    .addFields({ name: 'Inhalt', value: content })
    .setTimestamp();

  if (author) {
    embed.setAuthor({ name: author.username, iconURL: author.displayAvatarURL() });
    embed.setFooter({ text: `User-ID: ${author.id}` });
  }

  // Anhänge (nur verfügbar, wenn die Nachricht gecacht war)
  if (message.attachments?.size) {
    const names = message.attachments.map((a) => a.name).join(', ');
    embed.addFields({ name: 'Anhänge', value: names.slice(0, 1000) });
  }

  await logEvent(guild, 'message', embed, {
    username: author?.username,
    avatarURL: author?.displayAvatarURL(),
  });
};