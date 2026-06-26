const { Client, ModalSubmitInteraction, EmbedBuilder, MessageFlags } = require('discord.js');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

// Bitte mit der echten Channel-ID aus deinem Server ersetzen
const BOT_NEWS_CHANNEL_ID = '1520130420509905167';

module.exports = {
  customId: 'bot_news_modal',
  userPermissions: [],
  botPermissions: [],
  /**
   * @param {Client} client
   * @param {ModalSubmitInteraction} interaction
   */
  run: async (client, interaction) => {
    await interaction.deferReply(EPHEMERAL);

    const title       = interaction.fields.getTextInputValue('bot_news_title');
    const description = interaction.fields.getTextInputValue('bot_news_description');

    const channel = await client.channels.fetch(BOT_NEWS_CHANNEL_ID).catch(() => null);
    if (!channel) {
      return interaction.editReply({ content: '❌ Bot-News Channel nicht gefunden.' });
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x5865f2)
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[bot-news] Konnte Nachricht nicht senden:', err);
      return interaction.editReply({ content: '❌ Konnte die Bot-News nicht senden. Habe ich Schreibrechte in diesem Kanal?' });
    }

    await interaction.editReply({ content: '✅ Bot-News wurde gesendet.' });
  },
};