const { EmbedBuilder } = require('discord.js');
const { Infraction } = require('../../database/registry');

const PAGE_SIZE = 5;

const TYPE_META = {
  ban: { icon: '🔨', label: 'Ban' },
  timeout: { icon: '⏱️', label: 'Timeout' },
  warn: { icon: '⚠️', label: 'Warn' },
};

/**
 * Baut eine Strafregister-Seite (Embed) für einen User.
 *
 * @param {string} guildId
 * @param {import('discord.js').User} targetUser
 * @param {number} requestedPage  0-basiert. Wird auf gültigen Bereich gecappt.
 * @returns {Promise<{ embed: EmbedBuilder, totalPages: number }>}
 */
async function buildInfractionsPage(guildId, targetUser, requestedPage) {
  const totalCount = await Infraction.count({
    where: { guildId, userId: targetUser.id },
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.max(0, Math.min(requestedPage, totalPages - 1));

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📒 Strafregister von ${targetUser.tag}`)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .setFooter({
      text: `Seite ${page + 1} / ${totalPages} • ${totalCount} Eintrag${totalCount === 1 ? '' : 'e'}`,
    })
    .setTimestamp();

  if (totalCount === 0) {
    embed.setDescription('_Dieser User hat keine Einträge im Strafregister._');
    return { embed, totalPages: 1 };
  }

  const infractions = await Infraction.findAll({
    where: { guildId, userId: targetUser.id },
    order: [['createdAt', 'DESC']],
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  for (const inf of infractions) {
    const meta = TYPE_META[inf.type] ?? { icon: '❓', label: inf.type };
    const createdAtTs = Math.floor(new Date(inf.createdAt).getTime() / 1000);

    const lines = [
      `**Grund:** ${inf.reason || '_keiner_'}`,
      `**Moderator:** <@${inf.moderatorId}>`,
      `**Datum:** <t:${createdAtTs}:f> (<t:${createdAtTs}:R>)`,
    ];

    if (inf.type === 'timeout' && inf.expiresAt) {
      const expiresTs = Math.floor(new Date(inf.expiresAt).getTime() / 1000);
      lines.push(`**Lief ab:** <t:${expiresTs}:R>`);
    }

    embed.addFields({
      name: `${meta.icon} #${inf.id} — ${meta.label}`,
      value: lines.join('\n'),
      inline: false,
    });
  }

  return { embed, totalPages };
}

module.exports = { buildInfractionsPage, PAGE_SIZE };