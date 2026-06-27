// FILE: src/commands/general/mystatsCmd.js
//
// Shortcut: öffnet direkt den User-Stats-Embed ohne Select-Menü.

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const { Op, fn, col, literal } = require('sequelize');
const { MessageStat, VoiceStat } = require('../../database/registry');
const { zeitraumLabel } = require('./statsCmd');

// In-Memory Cooldown Map
const cooldowns = new Map();
const COOLDOWN_MS = 10_000;

function daysAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (n - 1));
  return d;
}

function fmtMinutes(min) {
  min = Number(min) || 0;
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function progressBar(value, max, len = 12) {
  if (max === 0) return '`' + '░'.repeat(len) + '`';
  const filled = Math.round((Number(value) / Number(max)) * len);
  return '`' + '█'.repeat(filled) + '░'.repeat(len - filled) + '`';
}

function buildDateFilter(zeitraum) {
  if (!zeitraum || zeitraum === 'all') return { where: {}, label: 'Gesamt' };
  const days = parseInt(zeitraum, 10);
  return { where: { date: { [Op.gte]: daysAgo(days) } }, label: zeitraumLabel(zeitraum) };
}

function zeitraumRow(current = 'all') {
  const opts = [
    { label: 'Gesamt',         value: 'all',  emoji: '📅' },
    { label: 'Letzte 7 Tage',  value: '7',    emoji: '📆' },
    { label: 'Letzte 30 Tage', value: '30',   emoji: '🗓️' },
    { label: 'Letztes Jahr',   value: '365',  emoji: '📊' },
  ];
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('stats:zeitraum')
      .setPlaceholder('📅 Zeitraum wählen...')
      .addOptions(opts.map(o =>
        new StringSelectMenuOptionBuilder()
          .setLabel(o.label).setValue(o.value).setEmoji(o.emoji).setDefault(o.value === current)
      ))
  );
}

function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('stats:back').setLabel('← Zurück').setStyle(ButtonStyle.Secondary)
  );
}

async function buildUserEmbed(user, guildId, zeitraum) {
  const { where, label } = buildDateFilter(zeitraum);
  const base = { guildId, userId: user.id, ...where };

  const [totalMsgs, totalVoice] = await Promise.all([
    MessageStat.sum('count',   { where: base }),
    VoiceStat.sum('minutes',   { where: base }),
  ]);

  // Rang berechnen
  const allUsers = await MessageStat.findAll({
    where: { guildId, ...where },
    attributes: ['userId', [fn('SUM', col('count')), 'total']],
    group: ['userId'],
    order: [[literal('total'), 'DESC']],
    raw: true,
  });
  const rank      = allUsers.findIndex(r => r.userId === user.id) + 1;
  const rankTotal = allUsers.length;
  const rankStr   = rank > 0 ? `#${rank} von ${rankTotal} Membern` : 'Keine Daten';

  const [topMsgCh, topVoiceCh] = await Promise.all([
    MessageStat.findAll({
      where: base,
      attributes: ['channelId', [fn('SUM', col('count')), 'total']],
      group: ['channelId'], order: [[literal('total'), 'DESC']], limit: 3, raw: true,
    }),
    VoiceStat.findAll({
      where: base,
      attributes: ['channelId', [fn('SUM', col('minutes')), 'total']],
      group: ['channelId'], order: [[literal('total'), 'DESC']], limit: 3, raw: true,
    }),
  ]);

  const maxCh      = topMsgCh[0]?.total   ?? 0;
  const maxVoiceCh = topVoiceCh[0]?.total ?? 0;

  const msgChLines = topMsgCh.length
    ? topMsgCh.map((r, i) =>
        `**${i + 1}.** <#${r.channelId}>\n${progressBar(r.total, maxCh)} **${Number(r.total).toLocaleString('de')}** Nachrichten`
      ).join('\n\n')
    : '_Keine Daten_';

  const voiceChLines = topVoiceCh.length
    ? topVoiceCh.map((r, i) =>
        `**${i + 1}.** <#${r.channelId}>\n${progressBar(r.total, maxVoiceCh)} **${fmtMinutes(r.total)}**`
      ).join('\n\n')
    : '_Keine Daten_';

  return new EmbedBuilder()
    .setTitle('👤 User-Statistiken')
    .setColor(0x57f287)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .addFields(
      { name: '📬 Nachrichten',  value: `\`${Number(totalMsgs ?? 0).toLocaleString('de')}\``, inline: true },
      { name: '🔊 Voice-Zeit',   value: `\`${fmtMinutes(totalVoice ?? 0)}\``,                 inline: true },
      { name: '🏅 Rang',         value: `\`${rankStr}\``,                                     inline: true },
      { name: '💬 Aktivste Text-Kanäle',  value: msgChLines,   inline: false },
      { name: '🎙️ Aktivste Voice-Kanäle', value: voiceChLines, inline: false },
    )
    .setFooter({ text: `typ:user|zeitraum:${zeitraum}|targetUser:${user.id}` })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mystats')
    .setDescription('Zeigt deine persönlichen Aktivitäts-Statistiken.'),

  userPermissions: [],
  botPermissions: [],
  testMode: false,
  devOnly: false,

  run: async (client, interaction) => {
    // Cooldown-Check
    const key      = `${interaction.guild.id}:${interaction.user.id}`;
    const lastUsed = cooldowns.get(key) ?? 0;
    const remaining = COOLDOWN_MS - (Date.now() - lastUsed);

    if (remaining > 0) {
      return interaction.reply({
        content: `\`⏳\` Bitte warte noch **${Math.ceil(remaining / 1000)}s** bevor du die Stats erneut abrufst.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    cooldowns.set(key, Date.now());

    await interaction.deferReply();

    try {
      const embed = await buildUserEmbed(interaction.user, interaction.guild.id, 'all');
      await interaction.editReply({
        embeds:     [embed],
        components: [zeitraumRow('all'), backRow()],
      });
    } catch (err) {
      console.error('[mystats] Fehler:', err);
      await interaction.editReply({ content: '`❌` Beim Laden der Statistiken ist ein Fehler aufgetreten.' });
    }
  },
};

// Export für statsSlct.js
module.exports.buildUserEmbed = buildUserEmbed;
module.exports.zeitraumRow    = zeitraumRow;
module.exports.backRow        = backRow;
module.exports.cooldowns      = cooldowns;
module.exports.COOLDOWN_MS    = COOLDOWN_MS;
module.exports.daysAgo        = daysAgo;
module.exports.fmtMinutes     = fmtMinutes;
module.exports.progressBar    = progressBar;
module.exports.buildDateFilter = buildDateFilter;