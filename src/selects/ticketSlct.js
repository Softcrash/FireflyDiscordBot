const {
  Client,
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  LabelBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  FileUploadBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const { getOpenTicketInCategory } = require('../utils/tickets/ticketHandler');

// Hier sollte die Channel ID des Ticket-Channels definiert sein
const TICKET_CHANNEL_ID = '1491460923435647157'; // Ersetze mit deiner echten Channel ID

module.exports = {
  customId: 'ticket_category_select',
  devOnly: false,
  testMode: false,
  userPermissions: [],
  botPermissions: [],
  category: 'ticket',
  /**
   * @param {Client} client
   * @param {StringSelectMenuInteraction} interaction
   */
  run: async (client, interaction) => {
    const selected = interaction.values[0];
    const { guild, user } = interaction;

    // Prüfe ob bereits ein offenes Ticket in dieser Kategorie existiert
    const openTicket = await getOpenTicketInCategory(guild, user.id, selected, TICKET_CHANNEL_ID);

    if (openTicket) {
      return interaction.reply({
        content: `❌ Du hast bereits ein offenes Ticket in dieser Kategorie!\n🔗 ${openTicket}`,
        ephemeral: true,
      });
    }

    let modal;

    switch (selected) {
      case 'comfySlct': {

  const upperInfoText = new TextDisplayBuilder()
    .setContent(
      '**🌿✨ Willkommen im Bewerbungsticket für den Dreamy Garden!**\n\n'+
      'Der Mainchat ist dir manchmal zu voll oder zu hektisch? Du fühlst dich in kleineren, ruhigeren Bereichen wohler und möchtest neue Leute in entspannter Atmosphäre kennenlernen? Dann könnte der Dreamy Garden genau der richtige Ort für dich sein.\n\n' +
      '**Bitte beantworte die folgenden Fragen:**'
    );

  const reasonInput = new TextInputBuilder()
    .setCustomId('dreamy_reason')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const reasonLabel = new LabelBuilder()
    .setLabel('Beitritts-Grund')
    .setDescription('🪻 Warum möchtest du dem Dreamy Garden beitreten?')
    .setTextInputComponent(reasonInput);

  const wunschInput = new TextInputBuilder()
    .setCustomId('dreamy_wunsch')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const wunschLabel = new LabelBuilder()
    .setLabel('Deine Wünsche')
    .setDescription('🪻 Was wünschst du dir von diesem Bereich?')
    .setTextInputComponent(wunschInput);

  const selfInput = new TextInputBuilder()
    .setCustomId('dreamy_self')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(60);

  const selfLabel = new LabelBuilder()
    .setLabel('Das bin ich')
    .setDescription('🪻 Wie würdest du dich selbst in 3 Worten beschreiben?')
    .setTextInputComponent(selfInput);

  const underInfoText = new TextDisplayBuilder()
    .setContent(
      '**✨🌿 Vielen Dank für deine Bewerbung! Ein Teammitglied wird sich schnellstmöglich bei dir melden.**'
    );  

  modal = new ModalBuilder()
    .setCustomId('ticket_modal_comfort_area')
    .setTitle('🌻 Dreamy Garden')
    .addTextDisplayComponents(upperInfoText)
    .addLabelComponents(reasonLabel, wunschLabel, selfLabel)
    .addTextDisplayComponents(underInfoText);
  break;
}

      case 'applicationSlct': {
  const positionSelect = new StringSelectMenuBuilder()
    .setCustomId('bewerbung_position')
    .setPlaceholder('Make a selection')
    .setRequired(true)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Developer')
        .setDescription('Coded für den Server und das Team')
        .setValue('Developer')
        .setEmoji('🔧'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Supporter')
        .setDescription('Hilft Mitgliedern bei Fragen')
        .setValue('Supporter')
        .setEmoji('🎧'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Event-Team')
        .setDescription('Organisiert Events auf dem Server')
        .setValue('Event-Team')
        .setEmoji('🎉'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Designer')
        .setDescription('Erstellt Grafiken und Embeds')
        .setValue('Designer')
        .setEmoji('🎨'),
    );

  const positionLabel = new LabelBuilder()
    .setLabel('Position')
    .setDescription('Für welche Position bewirbst du dich?')
    .setStringSelectMenuComponent(positionSelect);

  const alterInput = new TextInputBuilder()
    .setCustomId('bewerbung_alter')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('z.B. 18')
    .setRequired(true)
    .setMaxLength(3);

  const alterLabel = new LabelBuilder()
    .setLabel('Dein Alter')
    .setTextInputComponent(alterInput);

  const infoText = new TextDisplayBuilder()
    .setContent(
      '**Inhalt deiner Bewerbung sollte beinhalten:**\n' +
      '- Wieso genau diese Position?\n' +
      '- Wie bist du auf den Server gekommen?\n' +
      '- Wie aktiv bist du auf Discord?\n' +
      '- Bist du aktiv im Chat oder eher VC?\n' +
      '- Was ist dir in einer Community wichtig?\n' +
      '- Was sind deine Stärken?'
    );

  const bewerbungInput = new TextInputBuilder()
    .setCustomId('bewerbung_text')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Schreibe deine Bewerbung hier...')
    .setRequired(true)
    .setMaxLength(1000);

  const bewerbungLabel = new LabelBuilder()
    .setLabel('Deine Bewerbung')
    .setTextInputComponent(bewerbungInput);

  modal = new ModalBuilder()
    .setCustomId('ticket_modal_bewerbung')
    .setTitle('📋 Bewerbung')
    .addLabelComponents(positionLabel, alterLabel)
    .addTextDisplayComponents(infoText)
    .addLabelComponents(bewerbungLabel);
  break;
}

      case 'supportSlct': {
        const themaInput = new TextInputBuilder()
          .setCustomId('support_thema')
          .setLabel('Worum geht es?')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('z.B. Bot reagiert nicht')
          .setRequired(true)
          .setMaxLength(100);

        modal = new ModalBuilder()
          .setCustomId('ticket_modal_support')
          .setTitle('✉️ Support')
          .addComponents(
            new ActionRowBuilder().addComponents(themaInput),
          );
        break;
      }

      case 'adminSlct': {
        const themaInput = new TextInputBuilder()
          .setCustomId('admin_report')
          .setLabel('Worum geht es?')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('z.B. Teamler hat sich falsch benommen')
          .setRequired(true)
          .setMaxLength(500);

        modal = new ModalBuilder()
          .setCustomId('ticket_modal_admin')
          .setTitle('📓 Admin Report')
          .addComponents(
            new ActionRowBuilder().addComponents(themaInput),
          );
        break;
      }

      case 'partnerSlct': {
        const serverInput = new TextInputBuilder()
          .setCustomId('partnerschaft_server')
          .setLabel('Servername & Einladungslink')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('z.B. Mein Server — discord.gg/xyz')
          .setRequired(true)
          .setMaxLength(100);

        const memberInput = new TextInputBuilder()
          .setCustomId('partnerschaft_member')
          .setLabel('Mitgliederanzahl')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('z.B. 500')
          .setRequired(true)
          .setMaxLength(20);

        const angebotInput = new TextInputBuilder()
          .setCustomId('partnerschaft_angebot')
          .setLabel('Was bietest du im Gegenzug?')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('z.B. Werbung in unserem Partnerchannel, ...')
          .setRequired(true)
          .setMaxLength(500);

        modal = new ModalBuilder()
          .setCustomId('ticket_modal_partnerschaft')
          .setTitle('🤝 Partnerschaft')
          .addComponents(
            new ActionRowBuilder().addComponents(serverInput),
            new ActionRowBuilder().addComponents(memberInput),
            new ActionRowBuilder().addComponents(angebotInput),
          );
        break;
      }

      case 'reportSlct': {
        const userInput = new TextInputBuilder()
          .setCustomId('report_user')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('z.B. 123456789012345678')
          .setRequired(true)
          .setMaxLength(100);

        const userLabel = new LabelBuilder()
          .setLabel('User')
          .setDescription('Name oder ID des gemeldeten Users')
          .setTextInputComponent(userInput);

        const grundInput = new TextInputBuilder()
          .setCustomId('report_grund')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('z.B. Beleidigung, Spam, ...')
          .setRequired(true)
          .setMaxLength(100);

        const grundLabel = new LabelBuilder()
          .setLabel('Grund')
          .setDescription('Wofür meldest du den User?')
          .setTextInputComponent(grundInput);

        const beschreibungInput = new TextInputBuilder()
          .setCustomId('report_beschreibung')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Beschreibe den Vorfall so detailliert wie möglich.')
          .setRequired(true)
          .setMaxLength(1000);

        const beschreibungLabel = new LabelBuilder()
          .setLabel('Was ist passiert?')
          .setDescription('Beschreibe den Vorfall')
          .setTextInputComponent(beschreibungInput);

        const dateienUpload = new FileUploadBuilder()
          .setCustomId('report_dateien')
          .setMinValues(0)
          .setMaxValues(5)
          .setRequired(false);

        const dateienLabel = new LabelBuilder()
          .setLabel('Beweise / Anhänge (optional)')
          .setDescription('Screenshots oder andere Dateien — bis zu 5 Stück')
          .setFileUploadComponent(dateienUpload);

        modal = new ModalBuilder()
          .setCustomId('ticket_modal_report')
          .setTitle('🚨 Report')
          .addLabelComponents(userLabel, grundLabel, beschreibungLabel, dateienLabel);
        break;
      }

      default:
        return interaction.reply({ content: '❌ Unbekannte Kategorie.', ephemeral: true });
    }

    await interaction.showModal(modal);
    await interaction.message.suppressEmbeds(false);
  },
};