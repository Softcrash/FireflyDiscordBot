// FILE: src/selects/statsSlct.js
//
// customIds:
//   stats:select      → Kategorie wählen
//   stats:zeitraum    → Zeitraum wechseln
//   stats:channel     → Kanal wählen (Channel-Stats)

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const { fn, col, literal } = require('sequelize');
const { MessageStat, VoiceStat } = require('../database/registry');
const { buildMenuPayload, zeitraumLabel } = require('../commands/general/statsCmd');
const {
  buildUserEmbed,
  zeitraumRow,
  backRow,
  cooldowns,
  COOLDOWN_MS,
  daysAgo,
  fmtMinutes,
  progressBar,
  buildDateFilter,
} = require('../commands/general/mystatsCmd');
const { Op } = require('sequelize');

// ── Footer parsen ─────────────────────────────────────────────────────────────
// Format: "typ:server|zeitraum:all|targetUser:self"

function parseFooter(message) {
  const text     = message?.embeds?.[0]?.footer?.text ?? '';
  const typ       = text.match(/typ:(\w+)/)?.[1]        ?? null;
  const zeitraum  = text.match(/zeitraum:(\w+)/)?.[1]   ?? 'all';
  const targetUser = text.match(/targetUser:(\S+)/)?.[1] ?? 'self';
  return { typ, zeitraum, targetUser };
}

// ── Server-Embed ──────────────────────────────────────────────────────────────

async function buildServerEmbed(guild, zeitraum) {
  const { where, label } = buildDateFilter(zeitraum);
  const base = { guildId: guild.id, ...where };

  const [totalMsgs, totalVoice] = await Promise.all([
    MessageStat.sum('count',   { where: base }),
    VoiceStat.sum('minutes',   { where: base }),
  ]);

  const [topMsgUsers, topVoiceUsers, topChannels] = await Promise.all([
    MessageStat.findAll({
      where: base,
      attributes: ['userId', [fn('SUM', col('count')), 'total']],
      group: ['userId'], order: [[literal('total'), 'DESC']], limit: 3, raw: true,
    }),
    VoiceStat.findAll({
      where: base,
      attributes: ['userId', [fn('SUM', col('minutes')), 'total']],
      group: ['userId'], order: [[literal('total'), 'DESC']], limit: 3, raw: true,
    }),
    MessageStat.findAll({
      where: base,
      attributes: ['channelId', [fn('SUM', col('count')), 'total']],
      group: ['channelId'], order: [[literal('total'), 'DESC']], limit: 3, raw: true,
    }),
  ]);

  const maxMsg   = topMsgUsers[0]?.total   ?? 0;
  const maxVoice = topVoiceUsers[0]?.total ?? 0;

  const msgLines = topMsgUsers.length
    ? topMsgUsers.map((r, i) =>
        `**${i + 1}.** <@${r.userId}>\n${progressBar(r.total, maxMsg)} **${Number(r.total).toLocaleString('de')}** Nachrichten`
      ).join('\n\n')
    : '_Keine Daten_';

  const voiceLines = topVoiceUsers.length
    ? topVoiceUsers.map((r, i) =>
        `**${i + 1}.** <@${r.userId}>\n${progressBar(r.total, maxVoice)} **${fmtMinutes(r.total)}**`
      ).join('\n\n')
    : '_Keine Daten_';

  const channelLines = topChannels.length
    ? topChannels.map((r, i) =>
        `**${i + 1}.** <#${r.channelId}> — **${Number(r.total).toLocaleString('de')}** Nachrichten`
      ).join('\n')
    : '_Keine Daten_';

  return new EmbedBuilder()
    .setTitle(`🌐 Server-Statistiken — ${guild.name}`)
    .setColor(0x5865f2)
    .setThumbnail(guild.iconURL({ dynamic: true }) ?? null)
    .addFields(
      { name: '📬 Nachrichten gesamt', value: `\`${Number(totalMsgs ?? 0).toLocaleString('de')}\``, inline: true },
      { name: '🔊 Voice-Zeit gesamt',  value: `\`${fmtMinutes(totalVoice ?? 0)}\``,                 inline: true },
      { name: '\u200b',                value: '\u200b',                                              inline: true },
      { name: '🏆 Top Nachrichten-Member', value: msgLines,     inline: false },
      { name: '🎙️ Top Voice-Member',       value: voiceLines,   inline: false },
      { name: '📢 Top Kanäle',             value: channelLines, inline: false },
    )
    .setFooter({ text: `typ:server|zeitraum:${zeitraum}|targetUser:self` })
    .setTimestamp();
}

// ── Channel-Embed ─────────────────────────────────────────────────────────────

async function buildChannelEmbed(channel, guildId, zeitraum) {
  const { where, label } = buildDateFilter(zeitraum);
  const base = { guildId, channelId: channel.id, ...where };

  const totalMsgs = await MessageStat.sum('count', { where: base });

  const topUsers = await MessageStat.findAll({
    where: base,
    attributes: ['userId', [fn('SUM', col('count')), 'total']],
    group: ['userId'], order: [[literal('total'), 'DESC']], limit: 5, raw: true,
  });

  const maxUser = topUsers[0]?.total ?? 0;

  const userLines = topUsers.length
    ? topUsers.map((r, i) =>
        `**${i + 1}.** <@${r.userId}>\n${progressBar(r.total, maxUser)} **${Number(r.total).toLocaleString('de')}** Nachrichten`
      ).join('\n\n')
    : '_Keine Daten_';

  return new EmbedBuilder()
    .setTitle(`💬 Kanal-Statistiken — #${channel.name}`)
    .setColor(0xfee75c)
    .addFields(
      { name: '📬 Nachrichten gesamt', value: `\`${Number(totalMsgs ?? 0).toLocaleString('de')}\``, inline: true },
      { name: '🏆 Aktivste Member',    value: userLines, inline: false },
    )
    .setFooter({ text: `typ:channel|zeitraum:${zeitraum}|targetUser:${channel.id}` })
    .setTimestamp();
}

// ── Channel-Select aufbauen (Top-5 aktivste Kanäle als Optionen) ─────────────

async function buildChannelSelectRow(guildId, currentChannelId = null) {
  // Top-10 Kanäle nach Gesamtnachrichten als Optionen anbieten
  const topChannels = await MessageStat.findAll({
    where: { guildId },
    attributes: ['channelId', [fn('SUM', col('count')), 'total']],
    group: ['channelId'],
    order: [[literal('total'), 'DESC']],
    limit: 10,
    raw: true,
  });

  if (!topChannels.length) return null;

  const options = topChannels.map(r =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`#${r.channelId}`)  // Name wäre schöner, aber den kennen wir nicht ohne fetch
      .setValue(r.channelId)
      .setDescription(`${Number(r.total).toLocaleString('de')} Nachrichten gesamt`)
      .setDefault(r.channelId === currentChannelId)
  );

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('stats:channel')
      .setPlaceholder('💬 Kanal wählen...')
      .addOptions(options)
  );
}

// ── Shared: Payload zusammenbauen ─────────────────────────────────────────────

async function buildStatsReply(typ, zeitraum, targetUserVal, interaction) {
  const guild = interaction.guild;
  let embed;
  let components = [];

  if (typ === 'server') {
    embed = await buildServerEmbed(guild, zeitraum);
    components = [zeitraumRow(zeitraum), backRow()];

  } else if (typ === 'user') {
    // targetUser: 'self' → eigener User, sonst User-ID
    const user = targetUserVal && targetUserVal !== 'self'
      ? await interaction.client.users.fetch(targetUserVal).catch(() => interaction.user)
      : interaction.user;
    embed = await buildUserEmbed(user, guild.id, zeitraum);
    components = [zeitraumRow(zeitraum), backRow()];

  } else if (typ === 'channel') {
    // targetUserVal enthält hier die Channel-ID (nach erster Auswahl)
    const channelId = targetUserVal && targetUserVal !== 'self' ? targetUserVal : interaction.channel.id;
    const channel   = guild.channels.cache.get(channelId) ?? interaction.channel;
    embed = await buildChannelEmbed(channel, guild.id, zeitraum);

    const chSelectRow = await buildChannelSelectRow(guild.id, channelId);
    components = chSelectRow
      ? [chSelectRow, zeitraumRow(zeitraum), backRow()]
      : [zeitraumRow(zeitraum), backRow()];
  }

  return { embeds: [embed], components };
}

// ── Cooldown-Check ────────────────────────────────────────────────────────────

function checkCooldown(guildId, userId) {
  const key       = `${guildId}:${userId}`;
  const lastUsed  = cooldowns.get(key) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
  if (remaining > 0) return remaining;
  cooldowns.set(key, Date.now());
  return 0;
}

// ── Handler ───────────────────────────────────────────────────────────────────

module.exports = [
  // ── Kategorie wählen ────────────────────────────────────────────────────────
  {
    customId: 'stats:select',
    userPermissions: [],
    botPermissions: [],

    run: async (client, interaction) => {
      const remaining = checkCooldown(interaction.guild.id, interaction.user.id);
      if (remaining > 0) {
        return interaction.reply({
          content: `\`⏳\` Bitte warte noch **${Math.ceil(remaining / 1000)}s**.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferUpdate();

      const typ        = interaction.values[0];
      const { targetUser } = parseFooter(interaction.message);

      try {
        const reply = await buildStatsReply(typ, 'all', targetUser, interaction);
        await interaction.editReply(reply);
      } catch (err) {
        console.error('[stats/select] Fehler:', err);
        await interaction.editReply({ content: '`❌` Fehler beim Laden.', embeds: [], components: [backRow()] });
      }
    },
  },

  // ── Zeitraum wechseln ────────────────────────────────────────────────────────
  {
    customId: 'stats:zeitraum',
    userPermissions: [],
    botPermissions: [],

    run: async (client, interaction) => {
      const remaining = checkCooldown(interaction.guild.id, interaction.user.id);
      if (remaining > 0) {
        return interaction.reply({
          content: `\`⏳\` Bitte warte noch **${Math.ceil(remaining / 1000)}s**.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferUpdate();

      const zeitraum              = interaction.values[0];
      const { typ, targetUser }   = parseFooter(interaction.message);

      if (!typ || typ === 'menu') return;

      try {
        const reply = await buildStatsReply(typ, zeitraum, targetUser, interaction);
        await interaction.editReply(reply);
      } catch (err) {
        console.error('[stats/zeitraum] Fehler:', err);
        await interaction.editReply({ content: '`❌` Fehler beim Laden.', embeds: [], components: [backRow()] });
      }
    },
  },

  // ── Kanal wählen ─────────────────────────────────────────────────────────────
  {
    customId: 'stats:channel',
    userPermissions: [],
    botPermissions: [],

    run: async (client, interaction) => {
      const remaining = checkCooldown(interaction.guild.id, interaction.user.id);
      if (remaining > 0) {
        return interaction.reply({
          content: `\`⏳\` Bitte warte noch **${Math.ceil(remaining / 1000)}s**.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferUpdate();

      const channelId           = interaction.values[0];
      const { zeitraum }        = parseFooter(interaction.message);
      const channel             = interaction.guild.channels.cache.get(channelId) ?? interaction.channel;

      try {
        const embed       = await buildChannelEmbed(channel, interaction.guild.id, zeitraum);
        const chSelectRow = await buildChannelSelectRow(interaction.guild.id, channelId);
        const components  = chSelectRow
          ? [chSelectRow, zeitraumRow(zeitraum), backRow()]
          : [zeitraumRow(zeitraum), backRow()];

        await interaction.editReply({ embeds: [embed], components });
      } catch (err) {
        console.error('[stats/channel] Fehler:', err);
        await interaction.editReply({ content: '`❌` Fehler beim Laden.', embeds: [], components: [backRow()] });
      }
    },
  },
];