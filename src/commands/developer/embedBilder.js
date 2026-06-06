const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-builder')
    .setDescription('Sendet das Ticket-Panel in diesen Kanal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  devOnly: true,

  run: async (client, interaction) => {

    const embed = new EmbedBuilder()
      .setTitle('<a:2c_butterfly:1510198875116539989> Dreamy Garden – Regeln')
      .setDescription(
        'Willkommen im Garden! Dieser Bereich soll ein ruhiger, freundlicher und sicherer Ort für alle sein. Bitte halte dich an die folgenden Regeln:\n\n'+
        '<a:arrowwhite:1510198748779773973> **1. Respektvoller Umgang**\n\n'+
        '* Behandle alle Mitglieder mit Respekt, Freundlichkeit und Höflichkeit.\n'+
        '* Respektiere die Meinungen, Grenzen und Gefühle anderer.\n'+
        '* Achte auf einen freundlichen und angemessenen Umgangston.\n\n'+
        '<a:arrowwhite:1510198748779773973> 2. **Kein Mobbing oder Diskriminierung**\n\n'+
        '* Diskriminierung, Mobbing, Belästigung oder Hass jeglicher Art sind streng verboten.\n'+
        '* Persönliche Angriffe, Beleidigungen und Provokationen werden nicht toleriert.\n'+
        '* Niemand darf absichtlich ausgeschlossen oder ausgegrenzt werden.\n\n'+
        '<a:arrowwhite:1510198748779773973> **3. Ruhige und angenehme Atmosphäre**\n\n'+
        '* Dieser Bereich ist für entspannte Gespräche gedacht.\n'+
        '* Vermeide unnötigen Spam, Chaos oder störendes Verhalten.\n'+
        '* Übermäßiges Pingen oder das Aufdrängen von Gesprächen ist nicht erlaubt.\n\n'+
        '<a:arrowwhite:1510198748779773973> **4. Sensible Themen**\n\n'+
        '* Inhalte zu Selbstverletzung, Suizid, Essstörungen, schweren Krankheiten, Gewalt oder ähnlichen belastenden Themen sind hier nicht gestattet.\n'+
        '* Vermeide Inhalte, die anderen Angst machen, sie belasten oder stark negativ beeinflussen könnten.\n\n'+
        '<a:arrowwhite:1510198748779773973> **5. Privatsphäre schützen**\n\n'+
        '* Teile keine privaten Informationen von anderen Personen ohne deren ausdrückliche Zustimmung.\n'+
        '* Respektiere die Privatsphäre aller Mitglieder.\n\n'+
        '<a:arrowwhite:1510198748779773973> **6. Sprachkanäle**\n\n'+
        '* Achte auf eine angenehme Lautstärke und eine störungsfreie Atmosphäre.\n'+
        '* Lasse andere ausreden und gehe respektvoll miteinander um.\n\n'+
        '<a:arrowwhite:1510198748779773973> **7. Gemeinschaft fördern**\n\n'+
        '* Jeder soll sich willkommen fühlen und die Möglichkeit haben, neue Kontakte zu knüpfen.\n'+
        '* Unterstütze eine offene, freundliche und inklusive Community.\n\n'+
        '<a:FFY_s_yellow:1500440783168471130> DreamyGarden ist ein Ort zum Wohlfühlen. Hilf mit, eine positive und entspannte Atmosphäre für alle zu schaffen.'
      )
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Embed wurde gesendet.', ...EPHEMERAL });
  },
};