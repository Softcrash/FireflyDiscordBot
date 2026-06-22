const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Sendet das Ticket-Panel in diesen Kanal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  devOnly: true,
  run: async (client, interaction) => {
    const embed = new EmbedBuilder()
      .setTitle('🎫 Support-Center')
      .setDescription(
        'Wähle eine Kategorie aus dem Menü unten, um ein Ticket zu öffnen.\n\n'
      )
      .setColor(0x5865f2)
      .setFooter({ text: 'Ticket-System' })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category_select')
      .setPlaceholder('📂 Kategorie auswählen...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Admin Ticket')
          .setDescription('Administrative Angelegenheiten')
          .setValue('adminSlct')
          .setEmoji('📓'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Dreamy Garden')
          .setDescription('Komm in unseren Dreamy Garden')
          .setValue('comfySlct')
          .setEmoji('🌻'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Bewerbung')
          .setDescription('Bewirb dich als Teammitglied')
          .setValue('applicationSlct')
          .setEmoji('📋'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Support')
          .setDescription('Fragen oder Hilfe')
          .setValue('supportSlct')
          .setEmoji('✉️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Partnerschaft')
          .setDescription('Anfragen zur Kooperation')
          .setValue('partnerSlct')
          .setEmoji('🤝'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Report')
          .setDescription('Melde einen User oder ein Problem')
          .setValue('reportSlct')
          .setEmoji('🚨'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Technisches Probelm/Bug')
          .setDescription('Melde einen Technisches Probelm oder Bug')
          .setValue('techSlct')
          .setEmoji('🔧'),
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Ticket-Panel wurde gesendet.', ...EPHEMERAL });
  },
};