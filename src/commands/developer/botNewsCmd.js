const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot-news')
    .setDescription('Erstellt eine Bot-News.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  devOnly: true,

  run: async (client, interaction) => {
    const titleInput = new TextInputBuilder()
      .setCustomId('bot_news_title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(256);

    const titleLabel = new LabelBuilder()
      .setLabel('Titel')
      .setTextInputComponent(titleInput);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('bot_news_description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(4000);

    const descriptionLabel = new LabelBuilder()
      .setLabel('Nachricht')
      .setTextInputComponent(descriptionInput);

    const modal = new ModalBuilder()
      .setCustomId('bot_news_modal')
      .setTitle('Bot-News erstellen')
      .addLabelComponents(titleLabel, descriptionLabel);

    await interaction.showModal(modal);
  },
};