const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const ACCENT_COLOR = 0x57ce4e;
const REFRESH_BUTTON_ID = 'teamlist_refresh';

// Schutz gegen das 4000-Zeichen-Limit von Components V2:
// pro Rolle werden maximal so viele Member ausgeschrieben, der Rest als "… und X weitere".
const MAX_MEMBERS_PER_ROLE = 40;

/**
 * Baut den Team-Listen-Container.
 *
 * - Lädt alle Member der Guild (nötig damit `role.members` korrekt befüllt ist)
 * - Löst die konfigurierten Rollen auf und sortiert sie nach Hierarchie (Position absteigend)
 * - Listet pro Rolle alle Member, die diese Rolle haben
 * - Hängt unten einen "Aktualisieren"-Button an
 *
 * @param {import('discord.js').Guild} guild
 * @param {string[]} roleIds  Die konfigurierten Team-Rollen-IDs
 * @returns {Promise<ContainerBuilder>}
 */
async function buildTeamlistContainer(guild, roleIds) {
  // Alle Member fetchen → sonst kennt der Cache nicht alle Rollen-Mitglieder.
  await guild.members.fetch();

  // Rollen auflösen, gelöschte rausfiltern, nach Position (Hierarchie) sortieren.
  const roles = (Array.isArray(roleIds) ? roleIds : [])
    .map((id) => guild.roles.cache.get(id))
    .filter(Boolean)
    .sort((a, b) => b.position - a.position);

  const container = new ContainerBuilder().setAccentColor(ACCENT_COLOR);

  // Kopfzeile
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# 👥 ${guild.name} — Team`)
  );

  if (roles.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('_Keine gültigen Team-Rollen konfiguriert._')
    );
  }

  // Pro Rolle ein Abschnitt
  for (const role of roles) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    // Member dieser Rolle, alphabetisch nach Anzeigenamen
    const members = [...role.members.values()].sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );

    let memberList;
    if (members.length === 0) {
      memberList = '> _Niemand_';
    } else {
      const shown = members.slice(0, MAX_MEMBERS_PER_ROLE);
      memberList = shown.map((m) => `> ${m}`).join('\n');

      const overflow = members.length - shown.length;
      if (overflow > 0) {
        memberList += `\n> … und **${overflow}** weitere`;
      }
    }

    // Rollen-Mention als farbige Überschrift + Anzahl
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${role} — ${members.length}\n${memberList}`)
    );
  }

  // Refresh-Button unten im Container
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(REFRESH_BUTTON_ID)
        .setLabel('🔄 Aktualisieren')
        .setStyle(ButtonStyle.Secondary)
    )
  );

  return container;
}

module.exports = { buildTeamlistContainer, REFRESH_BUTTON_ID };