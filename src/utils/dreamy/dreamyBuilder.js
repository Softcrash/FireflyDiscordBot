const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { TEAM_ROLE_IDS, PING_ROLES, ACCENT_COLOR } = require('./dreamyConfig');

const REFRESH_BUTTON_ID = 'dreamy_refresh';
const ROLE_SELECT_ID = 'dreamy_role_select';

const MEMBER_FETCH_TTL_MS = 5 * 60 * 1000;
const lastFetchByGuild = new Map();

const INTRO_TEXT =
  'Der **Dreamy Garden** ist ein geschützter und entspannter Bereich innerhalb des Servers, ' +
  'der neuen Mitgliedern einen sanften, stressfreien Einstieg ermöglichen soll. ' +
  'Besonders introvertierte, schüchterne oder ruhige Personen können sich hier in ihrem ' +
  'eigenen Tempo einleben — ganz ohne Druck. Niemand muss sofort aktiv sein oder viel ' +
  'schreiben, um dazuzugehören.\n\n' +
  'Im Vordergrund stehen ein freundliches Miteinander, gegenseitiger Respekt und eine ' +
  'angenehme Atmosphäre. Hier darf man beobachten, langsam Kontakte knüpfen oder einfach ' +
  'die Gesellschaft anderer genießen — ein sicherer Raum für erste Gespräche, neue ' +
  'Freundschaften und um die Community Schritt für Schritt kennenzulernen.';

const RULES_TEXT =
  '**Hier gilt:**\n' +
  '- Kein Druck, aktiv sein zu müssen\n' +
  '- Jeder darf in seinem eigenen Tempo ankommen\n' +
  '- Ruhige und entspannte Atmosphäre\n' +
  '- Freundliche Unterstützung für neue Mitglieder\n' +
  '- Ein Ort zum Wohlfühlen und Kennenlernen\n\n' +
  'Egal ob du sofort mitschreiben möchtest oder lieber erst in Ruhe ankommst – im ' +
  'Dreamy Garden bist du herzlich willkommen und kannst ganz du selbst sein.';

/**
 * Stellt sicher, dass der Member-Cache aktuell genug ist — ohne bei jedem Aufruf
 * einen vollständigen (rate-limiteten) Gateway-Fetch abzufeuern.
 * @param {import('discord.js').Guild} guild
 */
async function ensureMembersCached(guild) {
  const last = lastFetchByGuild.get(guild.id) ?? 0;
  if (Date.now() - last < MEMBER_FETCH_TTL_MS) return;

  try {
    await guild.members.fetch();
    lastFetchByGuild.set(guild.id, Date.now());
  } catch (err) {
    // z.B. GatewayRateLimitError → wir arbeiten einfach mit dem vorhandenen Cache weiter.
    console.warn('[dreamy] members.fetch() übersprungen, nutze Cache:', err.message);
  }
}

/**
 * Sammelt alle Member der konfigurierten Team-Rollen, dedupliziert und sortiert.
 * @param {import('discord.js').Guild} guild
 * @returns {import('discord.js').GuildMember[]}
 */
function collectTeamMembers(guild) {
  const seen = new Map();
  for (const roleId of TEAM_ROLE_IDS) {
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;
    for (const [id, member] of role.members) {
      if (!seen.has(id)) seen.set(id, member);
    }
  }
  return [...seen.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

/**
 * Baut den kompletten Dreamy-Garden-Container (Components V2).
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<ContainerBuilder>}
 */
async function buildDreamyContainer(guild) {
  await ensureMembersCached(guild);

  const container = new ContainerBuilder().setAccentColor(ACCENT_COLOR);

  // ----- Header + Deko -----
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '# 🌻 Dreamy Garden\n' +
        '╭───────────── ⋆⋅☆⋅⋆ ─────────────╮\n' +
        '    *Ein ruhiger Ort zum Ankommen*\n' +
        '╰───────────── ⋆⋅☆⋅⋆ ─────────────╯',
    ),
  );

  // ----- Intro -----
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(INTRO_TEXT));

  // ----- Regeln -----
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(RULES_TEXT));

  // ----- Separator -----
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  // ----- Dreamy Team (live) -----
  const teamMembers = collectTeamMembers(guild);
  const teamList =
    teamMembers.length === 0
      ? '> _Aktuell ist niemand im Dreamy-Team._'
      : teamMembers.map((m) => `> ${m}`).join('\n');

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '### 💞 Dreamy Team\n' +
        'Wir sind eure Ansprechpartner und offen für jede Art von Gespräch. <33\n\n' +
        teamList,
    ),
  );

  // ----- Refresh-Button -----
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(REFRESH_BUTTON_ID)
        .setLabel('🔄 Team aktualisieren')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  // ----- Separator -----
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  // ----- Ping-Rollen + Select -----
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '### 🔔 Ping-Rollen\n' +
        'Wähle unten aus, worüber du benachrichtigt werden möchtest. ' +
        'Erneutes Auswählen einer Rolle entfernt sie wieder.',
    ),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId(ROLE_SELECT_ID)
    .setPlaceholder('🌸 Wähle deine Dreamy-Rolle...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      PING_ROLES.map((r) => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(r.label)
          .setValue(r.roleId)
          .setEmoji(r.emoji);
        if (r.description) option.setDescription(r.description);
        return option;
      }),
    );

  container.addActionRowComponents(new ActionRowBuilder().addComponents(select));

  return container;
}

module.exports = { buildDreamyContainer, REFRESH_BUTTON_ID, ROLE_SELECT_ID };