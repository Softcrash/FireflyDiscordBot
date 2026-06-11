'use strict';

// ════════════════════════════════════════════════════════════════════
//  Teamstatus-Panel – gemeinsame Logik (Components V2, ohne DB)
//  ------------------------------------------------------------------
//  Der Status lebt ausschließlich in der Panel-Nachricht selbst:
//  Bei jeder Interaktion wird der aktuelle Stand aus der Nachricht
//  geparst, der Eintrag des Klickenden überschrieben und neu gerendert.
//  → Übersteht sogar pm2-Restarts, da Discord die Nachricht hält.
//  Einzige Kopplung ist das Zeilenformat – das kontrollieren wir hier.
// ════════════════════════════════════════════════════════════════════

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');

// ─── Konfiguration ───────────────────────────────────────────────────
const ACCENT_COLOR     = 0xffce4f;   // Markenfarbe (Amber)
const CHAR_BUDGET      = 3800;       // max. Zeichen für den Mitglieder-Block
const MEMBER_CACHE_TTL = 30_000;     // Mitglieder-Fetch zwischenspeichern (ms)
const REFRESH_COOLDOWN = 30_000;     // Sperre pro Server für den Refresh-Button (ms)
const DEFAULT_STATUS   = 'AKTIV';    // Status für neu hinzugekommene Teamler
const DOT              = '·';        // Trenner zwischen Status und Zeitraum

// ─── Status-Definitionen ─────────────────────────────────────────────
const STATUS = {
  AKTIV:      { emoji: '🟢', label: 'Aktiv' },
  ABGEMELDET: { emoji: '🔴', label: 'Abgemeldet' },
  INAKTIV:    { emoji: '⚫', label: 'Inaktiv' },
};
// Aus STATUS abgeleitet → Emojis bleiben garantiert konsistent zum Parser
const STATUS_BY_EMOJI = Object.fromEntries(
  Object.entries(STATUS).map(([key, def]) => [def.emoji, key]),
);

// ─── Custom-IDs ──────────────────────────────────────────────────────
const ID = {
  PREFIX:    'teamstatus',
  REFRESH:   'teamstatus:refresh',
  AKTIV:     'teamstatus:aktiv',
  ABMELDEN:  'teamstatus:abmelden',
  INAKTIV:   'teamstatus:inaktiv',
  MODAL:     'teamstatus:abmelden:modal',
  MODAL_VON: 'von',
  MODAL_BIS: 'bis',
};

// ┌────────────────────────────────────────────────────────────────────┐
// │ ANPASSEN: Teamrollen-Quelle                                          │
// │ ------------------------------------------------------------------   │
// │ Liefert die Rollen-IDs, die als „Team" gelten. Standardmäßig aus     │
// │ der untenstehenden Map. Ersetze den Funktionskörper, um stattdessen  │
// │ deine bestehende Teamlisten-Config (DB) abzufragen, z. B.:           │
// │                                                                      │
// │   const cfg = await TeamlistConfig.findAll({ where: { guildId } });  │
// │   return cfg.map(r => r.roleId);                                     │
// └────────────────────────────────────────────────────────────────────┘
const TEAM_ROLE_IDS = {
  // 'GUILD_ID': ['ROLLEN_ID_1', 'ROLLEN_ID_2', ...],
  // Beispiel:
  // '123456789012345678': ['111111111111111111', '222222222222222222'],
};

async function getTeamRoleIds(guild) {
  if (!guild?.id) throw new Error('getTeamRoleIds: guild fehlt – Handler-Signatur prüfen (client/interaction vertauscht?)');
  return TEAM_ROLE_IDS[guild.id] ?? [];
}

// ─── Mitglieder-Fetch mit TTL-Cache (Rate-Limit-Schutz) ──────────────
const memberCache = new Map(); // guildId -> { at, members }

async function fetchGuildMembers(guild) {
  const cached = memberCache.get(guild.id);
  if (cached && Date.now() - cached.at < MEMBER_CACHE_TTL) return cached.members;
  const members = await guild.members.fetch();
  memberCache.set(guild.id, { at: Date.now(), members });
  return members;
}

// ─── Refresh-Cooldown pro Server ─────────────────────────────────────
const refreshCooldown = new Map(); // guildId -> timestamp (ms)

function getRefreshCooldown(guildId) {
  const until = refreshCooldown.get(guildId) ?? 0;
  const rest = until - Date.now();
  return rest > 0 ? Math.ceil(rest / 1000) : 0;
}
function setRefreshCooldown(guildId) {
  refreshCooldown.set(guildId, Date.now() + REFRESH_COOLDOWN);
}

// ─── Teamler einsammeln (dedupliziert über alle Rollen) ──────────────
// Mehrfachrollen-Teamler erscheinen genau einmal (Key = userId).
// Sortierung: höchste Teamrolle zuerst, dann alphabetisch.
async function collectTeamMembers(guild) {
  const roleIds = await getTeamRoleIds(guild);
  if (!roleIds.length) return { roleIds, members: [] };

  const all = await fetchGuildMembers(guild);
  const seen = new Map(); // userId -> { id, topPos, name }

  for (const member of all.values()) {
    let topPos = -1;
    let isTeam = false;
    for (const rid of roleIds) {
      if (member.roles.cache.has(rid)) {
        isTeam = true;
        const pos = guild.roles.cache.get(rid)?.position ?? 0;
        if (pos > topPos) topPos = pos;
      }
    }
    if (!isTeam) continue;

    const existing = seen.get(member.id);
    if (existing) {
      if (topPos > existing.topPos) existing.topPos = topPos;
    } else {
      seen.set(member.id, {
        id: member.id,
        topPos,
        name: member.displayName.toLowerCase(),
      });
    }
  }

  const members = [...seen.values()]
    .sort((a, b) => b.topPos - a.topPos || a.name.localeCompare(b.name))
    .map(x => x.id);

  return { roleIds, members };
}

// ─── Status aus bestehender Panel-Nachricht parsen ───────────────────
function collectTextContents(components, out = []) {
  if (!Array.isArray(components)) return out;
  for (const c of components) {
    if (typeof c?.content === 'string') out.push(c.content);
    if (Array.isArray(c?.components)) collectTextContents(c.components, out);
  }
  return out;
}

function parsePanelState(message) {
  const texts = collectTextContents(message.components);
  const emojiAlt = Object.keys(STATUS_BY_EMOJI).join('|');
  // <@id> — <emoji> **Label** [· Zeitraum]
  const lineRe = new RegExp(
    `<@!?(\\d+)>\\s*[—–-]\\s*(${emojiAlt})\\s*\\*\\*[^*]*\\*\\*(?:\\s*${DOT}\\s*([^\\n]*))?`,
    'gu',
  );

  const state = new Map(); // userId -> { status, period }
  for (const t of texts) {
    let m;
    while ((m = lineRe.exec(t)) !== null) {
      const [, id, emoji, period] = m;
      state.set(id, {
        status: STATUS_BY_EMOJI[emoji] ?? DEFAULT_STATUS,
        period: period ? period.trim() : null,
      });
    }
  }
  return state;
}

// ─── Datum: Parsen / Formatieren (TT.MM.JJJJ) ────────────────────────
function parseGermanDate(input) {
  const s = (input ?? '').trim();
  if (!s) return { provided: false, valid: true, date: null };

  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!m) return { provided: true, valid: false, date: null };

  let day = Number(m[1]);
  let month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;

  const date = new Date(year, month - 1, day);
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return { provided: true, valid, date: valid ? date : null };
}

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}.${m}.${date.getFullYear()}`;
}

function buildPeriodLabel(vonDate, bisDate) {
  if (vonDate && bisDate) return `${formatDate(vonDate)} – ${formatDate(bisDate)}`;
  if (!vonDate && bisDate) return `ab sofort bis ${formatDate(bisDate)}`;
  if (vonDate && !bisDate) return `ab ${formatDate(vonDate)}`;
  return 'ab sofort';
}

// ─── Eine Mitglieder-Zeile rendern ───────────────────────────────────
function formatLine(userId, entry) {
  const def = STATUS[entry.status] ?? STATUS[DEFAULT_STATUS];
  let line = `<@${userId}> — ${def.emoji} **${def.label}**`;
  if (entry.status === 'ABGEMELDET' && entry.period) line += ` ${DOT} ${entry.period}`;
  return line;
}

// ─── Mitglieder-Block mit Zeichen-Budget ─────────────────────────────
function buildMemberBlock(state) {
  if (state.size === 0) return '-# Aktuell sind keine Teammitglieder hinterlegt.';

  const lines = [];
  let used = 0;
  let overflow = 0;

  for (const [id, entry] of state) {
    const line = formatLine(id, entry);
    if (used + line.length + 1 > CHAR_BUDGET) { overflow++; continue; }
    lines.push(line);
    used += line.length + 1;
  }
  if (overflow > 0) lines.push(`-# … und ${overflow} weitere (Zeichenlimit erreicht)`);
  return lines.join('\n');
}

// ─── Buttons ─────────────────────────────────────────────────────────
function buildButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ID.REFRESH).setEmoji('🔄').setLabel('Aktualisieren').setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(ID.AKTIV).setEmoji('🟢').setLabel('Aktiv').setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(ID.ABMELDEN).setEmoji('🔴').setLabel('Abmelden').setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(ID.INAKTIV).setEmoji('⚫').setLabel('Inaktiv').setStyle(ButtonStyle.Secondary),
  );
}

// ─── Panel bauen ─────────────────────────────────────────────────────
function buildPanel(state) {
  const ts = Math.floor(Date.now() / 1000);
  const header =
    `## 📋 Teamstatus\n` +
    `Setze deinen Status über die Buttons. 🟢 Aktiv · 🔴 Abmelden · ⚫ Inaktiv\n` +
    `-# Zuletzt aktualisiert: <t:${ts}:R>`;

  const container = new ContainerBuilder().setAccentColor(ACCENT_COLOR);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(header));
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(buildMemberBlock(state)));
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addActionRowComponents(buildButtons());
  return container;
}

// ─── Abmelden-Modal ──────────────────────────────────────────────────
function buildAbmeldenModal() {
  const von = new TextInputBuilder()
    .setCustomId(ID.MODAL_VON)
    .setLabel('Von (TT.MM.JJJJ) – leer = ab sofort')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('z. B. 15.06.2026')
    .setRequired(false)
    .setMaxLength(10);

  const bis = new TextInputBuilder()
    .setCustomId(ID.MODAL_BIS)
    .setLabel('Bis (TT.MM.JJJJ) – optional')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('z. B. 20.06.2026')
    .setRequired(false)
    .setMaxLength(10);

  return new ModalBuilder()
    .setCustomId(ID.MODAL)
    .setTitle('Abmelden')
    .addComponents(
      new ActionRowBuilder().addComponents(von),
      new ActionRowBuilder().addComponents(bis),
    );
}

// ─── Ist der Klickende ein Teammitglied? (ohne Fetch, eigene Rollen) ──
async function isTeamMember(interaction) {
  const roleIds = await getTeamRoleIds(interaction.guild);
  if (!roleIds.length) return false;
  return roleIds.some(rid => interaction.member.roles.cache.has(rid));
}

// ─── Gemeinsamer Payload ─────────────────────────────────────────────
// withFlags: true  → initiale Sends (Flag muss gesetzt werden)
// withFlags: false → Edits auf bestehende CV2-Nachricht (Flag liegt
//                    bereits auf der Nachricht, z. B. nach deferUpdate)
function panelPayload(state, { withFlags = true } = {}) {
  const payload = {
    components: [buildPanel(state)],
    allowedMentions: { parse: [] },
  };
  if (withFlags) payload.flags = MessageFlags.IsComponentsV2;
  return payload;
}

module.exports = {
  STATUS, ID, DEFAULT_STATUS,
  getTeamRoleIds, fetchGuildMembers, collectTeamMembers,
  parsePanelState, parseGermanDate, formatDate, buildPeriodLabel,
  buildPanel, buildAbmeldenModal, buildMemberBlock, formatLine,
  isTeamMember, panelPayload,
  getRefreshCooldown, setRefreshCooldown,
};