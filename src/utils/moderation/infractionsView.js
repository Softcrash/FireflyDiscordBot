const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { Infraction } = require('../../database/registry');

const PAGE_SIZE = 5;
const ACCENT_COLOR = 0x5865f2;

// Schutz gegen das 4000-Zeichen-Budget von Components V2:
// jeder Grund wird in der Anzeige auf diese Länge gekürzt.
const REASON_MAX = 240;

const TYPE_META = {
  ban: { icon: '🔨', label: 'Ban' },
  timeout: { icon: '⏱️', label: 'Timeout' },
  warn: { icon: '⚠️', label: 'Warn' },
};

function truncate(str, max) {
  if (!str) return str;
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

/**
 * Baut den Strafregister-Container (Components V2) für einen User.
 *
 * Jeder Verstoß ist eine eigene Section mit Lösch-Button als Accessory.
 * Der Lösch-Button trägt seine Daten im customId: `inf:del:<infId>:<userId>:<page>`.
 * Die Blätter-Buttons nutzen: `inf:page:<userId>:<zielSeite>`.
 *
 * @param {string} guildId
 * @param {import('discord.js').User} targetUser
 * @param {number} requestedPage  0-basiert. Wird auf gültigen Bereich gecappt.
 * @returns {Promise<{ container: ContainerBuilder, totalPages: number, page: number }>}
 */
async function buildInfractionsContainer(guildId, targetUser, requestedPage) {
  const totalCount = await Infraction.count({
    where: { guildId, userId: targetUser.id },
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.max(0, Math.min(requestedPage, totalPages - 1));

  const container = new ContainerBuilder().setAccentColor(ACCENT_COLOR);

  // ----- Kopfzeile -----
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 📒 Strafregister von ${targetUser.tag}\n` +
        `**${totalCount}** Eintrag${totalCount === 1 ? '' : 'e'} • Seite **${page + 1}/${totalPages}**`
    )
  );

  if (totalCount === 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('_Dieser User hat keine Einträge im Strafregister._')
    );
    return { container, totalPages: 1, page: 0 };
  }

  const offset = page * PAGE_SIZE;
  const infractions = await Infraction.findAll({
    where: { guildId, userId: targetUser.id },
    order: [['createdAt', 'DESC']],
    limit: PAGE_SIZE,
    offset,
  });

  infractions.forEach((inf, i) => {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    const meta = TYPE_META[inf.type] ?? { icon: '❓', label: inf.type };
    const createdAtTs = Math.floor(new Date(inf.createdAt).getTime() / 1000);

    // Pro-User-Nummer: ältester Eintrag = #1, neuester = #totalCount.
    // Da wir DESC (neueste zuerst) sortieren, ist die laufende Nummer
    // = totalCount minus der absoluten Position in der Liste.
    const userIndex = totalCount - (offset + i);

    const lines = [
      `### ${meta.icon} #${userIndex} — ${meta.label}`,
      `**Grund:** ${truncate(inf.reason, REASON_MAX) || '_keiner_'}`,
      `**Moderator:** <@${inf.moderatorId}>`,
      `**Datum:** <t:${createdAtTs}:f> (<t:${createdAtTs}:R>)`,
    ];

    if (inf.type === 'timeout' && inf.expiresAt) {
      const expiresTs = Math.floor(new Date(inf.expiresAt).getTime() / 1000);
      lines.push(`**Lief ab:** <t:${expiresTs}:R>`);
    }

    // Stabile DB-ID dezent als Subtext (wird im Modlog & in Bestätigungen referenziert).
    lines.push(`-# DB-ID: #${inf.id}`);

    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`inf:del:${inf.id}:${targetUser.id}:${page}`)
          .setLabel('Löschen')
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger)
      );

    container.addSectionComponents(section);
  });

  // ----- Blättern (nur wenn mehr als eine Seite) -----
  if (totalPages > 1) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    );
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`inf:page:${targetUser.id}:${page - 1}`)
          .setLabel('Zurück')
          .setEmoji('◀️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0),
        new ButtonBuilder()
          .setCustomId(`inf:page:${targetUser.id}:${page + 1}`)
          .setLabel('Weiter')
          .setEmoji('▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1)
      )
    );
  }

  return { container, totalPages, page };
}

module.exports = { buildInfractionsContainer, PAGE_SIZE };