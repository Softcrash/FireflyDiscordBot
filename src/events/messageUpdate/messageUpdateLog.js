const { EmbedBuilder } = require('discord.js');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { COLORS } = require('../../utils/moderation/logging/logConstants');

module.exports = async (client, oldMessage, newMessage) => {
  if (newMessage.partial) {
    newMessage = await newMessage.fetch().catch(() => null);
    if (!newMessage) return;
  }

  const guild = newMessage.guild;
  if (!guild) return; // DMs ignorieren
  if (newMessage.author?.bot || newMessage.webhookId) return;

  if (!newMessage.editedTimestamp) return;

  const before = oldMessage.partial
    ? '`— nicht im Cache —`'
    : oldMessage.content?.length
    ? oldMessage.content.slice(0, 1000)
    : '`— leer —`';
  const after = newMessage.content?.length ? newMessage.content.slice(0, 1000) : '`— leer —`';

  if (!oldMessage.partial && before === after) return;

  const author = newMessage.author;

  const embed = new EmbedBuilder()
    .setColor(COLORS.update)
    .setTitle('✏️ Nachricht bearbeitet')
    .setDescription(
      `**Autor:** ${author ? `${author} (\`${author.id}\`)` : '`unbekannt`'}\n` +
        `**Kanal:** <#${newMessage.channelId}> · [Zur Nachricht](${newMessage.url})`
    )
    .addFields(
      { name: 'Vorher', value: before },
      { name: 'Nachher', value: after }
    )
    .setTimestamp();

  if (author) {
    embed.setAuthor({ name: author.username, iconURL: author.displayAvatarURL() });
    embed.setFooter({ text: `User-ID: ${author.id}` });
  }

  await logEvent(guild, 'message', embed, {
    username: author?.username,
    avatarURL: author?.displayAvatarURL(),
  });
};