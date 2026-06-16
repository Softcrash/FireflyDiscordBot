// FILE: src/commands/general/statsCmd.js

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

function buildMenuPayload(targetUserId = null) {
  const embed = new EmbedBuilder()
    .setTitle('📊 Statistiken')
    .setDescription('Wähle eine Kategorie aus dem Menü unten.\n💡 Tipp: Mit `/stats user:@member` kannst du Stats eines bestimmten Members anzeigen.')
    .setColor(0x5865f2)
    // Footer speichert den Ziel-User für Select/Button-Handler
    .setFooter({ text: `typ:menu|zeitraum:all|targetUser:${targetUserId ?? 'self'}` });

  const select = new StringSelectMenuBuilder()
    .setCustomId('stats:select')
    .setPlaceholder('📂 Kategorie auswählen...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Server-Statistiken')
        .setDescription('Top-Member, Top-Kanäle, Voice-Zeit')
        .setValue('server')
        .setEmoji('🌐'),
      new StringSelectMenuOptionBuilder()
        .setLabel('User-Statistiken')
        .setDescription(targetUserId ? 'Stats des gewählten Users' : 'Deine persönlichen Stats')
        .setValue('user')
        .setEmoji('👤'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Kanal-Statistiken')
        .setDescription('Aktivste Member in einem Kanal')
        .setValue('channel')
        .setEmoji('💬'),
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
  };
}

function zeitraumLabel(z) {
  if (z === '7')   return 'Letzte 7 Tage';
  if (z === '30')  return 'Letzte 30 Tage';
  if (z === '365') return 'Letztes Jahr';
  return 'Gesamt';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Zeigt Aktivitäts-Statistiken für den Server.')
    .addUserOption((opt) =>
      opt
        .setName('user')
        .setDescription('Stats eines bestimmten Members anzeigen (leer = deine eigenen)')
        .setRequired(false)
    ),

  userPermissions: [],
  botPermissions: [],
  testMode: false,
  devOnly: false,

  run: async (client, interaction) => {
    const targetUser   = interaction.options.getUser('user') ?? null;
    const targetUserId = targetUser?.id ?? null;
    await interaction.reply(buildMenuPayload(targetUserId));
  },
};

module.exports.buildMenuPayload = buildMenuPayload;
module.exports.zeitraumLabel    = zeitraumLabel;