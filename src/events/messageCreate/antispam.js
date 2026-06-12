const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Infraction } = require('../../database/registry');
const { trackMessage, resetUser } = require('../../utils/antispam/spamTracker');
const {
  FLOOD_MSG_COUNT,
  DUPLICATE_COUNT,
  DUPLICATE_MIN_LENGTH,
  MENTION_LIMIT,
  OWN_GUILD_ID,
  BLOCK_INVITES,
  BLOCK_EXTERNAL_LINKS,
  ALLOWED_DOMAINS,
  TIMEOUT_ON_WARN,
  TIMEOUT_DURATION_MS,
  TIMEOUT_DURATION_HUMAN,
  KICK_ON_WARN,
} = require('../../utils/antispam/antispamConfig');

// ── Regex ─────────────────────────────────────────────────────────────────────
const INVITE_REGEX = /discord(?:\.gg|(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/i;
const URL_REGEX = /https?:\/\/([a-zA-Z0-9.-]+)/gi;

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function isExempt(member) {
  const exemptRoles = ["1501651717324935408", "1491474814546874609"];

  if (member.user.bot) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) return true;
  if (exemptRoles.some(roleId => member.roles.has(roleId))) return true;
  return false;
}

function isAllowedUrl(url) {
  try {
    const match = url.match(/https?:\/\/([a-zA-Z0-9.-]+)/i);
    if (!match) return false;
    const hostname = match[1].toLowerCase().replace(/^www\./, '');
    return ALLOWED_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/**
 * Prüft ob ein Invite-Code zum eigenen Server gehört.
 * Gibt true zurück wenn ja (→ durchlassen), false wenn fremder Server (→ Warn).
 * @param {import('discord.js').Client} client
 * @param {string} code
 * @returns {Promise<boolean>}
 */
async function isOwnServerInvite(client, code) {
  try {
    const invite = await client.fetchInvite(code);
    return invite?.guild?.id === OWN_GUILD_ID;
  } catch {
    // Invite ungültig oder abgelaufen → als fremd behandeln
    return false;
  }
}

/**
 * Gibt zurück ob die Nachricht einen stillen Link-Verstoß enthält
 * (löschen + Info, aber KEIN Warn). Nur für externe Links — Invites
 * werden separat geprüft da sie async sind.
 * @returns {{ type: 'link', reason: string } | null}
 */
function detectExternalLink(content) {
  if (!BLOCK_EXTERNAL_LINKS) return null;

  const urls = [...content.matchAll(URL_REGEX)].map((m) => m[0]);
  const blockedUrl = urls.find((url) => !isAllowedUrl(url));
  if (blockedUrl) {
    return { type: 'link', reason: 'Externe Links sind hier nicht erlaubt.' };
  }

  return null;
}

/**
 * Gibt zurück ob die Nachricht Spam ist (Flood / Duplicate / Mention).
 * Diese Typen lösen einen Warn + Eskalation aus.
 * @returns {{ type: string, reason: string } | null}
 */
function detectSpam(message, stats) {
  const content = message.content;

  // Mention-Spam
  const mentionCount =
    message.mentions.users.size +
    message.mentions.roles.size +
    (message.mentions.everyone ? 1 : 0);
  if (mentionCount >= MENTION_LIMIT) {
    return { type: 'mention', reason: `Mention-Spam (${mentionCount} Mentions)` };
  }

  // Duplicate-Spam
  const normalizedContent = content.toLowerCase().trim();
  if (normalizedContent.length >= DUPLICATE_MIN_LENGTH && stats.duplicateCount >= DUPLICATE_COUNT) {
    return { type: 'duplicate', reason: `Duplicate-Spam (${stats.duplicateCount}x gleiche Nachricht)` };
  }

  // Flood
  if (stats.floodCount >= FLOOD_MSG_COUNT) {
    return { type: 'flood', reason: `Nachrichten-Flood (${stats.floodCount} Msgs in kurzer Zeit)` };
  }

  return null;
}

// ── Stille Info-Nachricht (Links) ─────────────────────────────────────────────

async function handleLinkViolation(message, violation) {
  await message.delete().catch(() => {});

  const info = await message.channel
    .send({
      content: `ℹ️ ${message.author} – ${violation.reason}`,
      allowedMentions: { users: [message.author.id] },
    })
    .catch(() => null);

  if (info) setTimeout(() => info.delete().catch(() => {}), 5_000);
}

// ── Warn + Eskalation ─────────────────────────────────────────────────────────

async function handleSpam(client, message, spam) {
  const { guild, member, author: user } = message;

  await message.delete().catch(() => {});

  // Alle Warns zählen (kein Verfall)
  const warnCount = await Infraction.count({
    where: {
      guildId: guild.id,
      userId: user.id,
      type: 'warn',
    },
  });

  const newWarnCount = warnCount + 1;

  // Warn in DB speichern
  let infraction;
  try {
    infraction = await Infraction.create({
      guildId: guild.id,
      userId: user.id,
      moderatorId: client.user.id,
      type: 'warn',
      reason: `[AutoMod] ${spam.reason}`,
    });
  } catch (err) {
    console.error('[antispam] Warn-Infraction konnte nicht gespeichert werden:', err);
  }

  // Modlog
  client.emit('moderationAction', {
    guild,
    moderator: guild.members.me,
    targetUser: user,
    type: 'warn',
    reason: `[AutoMod] ${spam.reason}`,
    durationHuman: null,
    expiresAt: null,
    infraction,
  });

  // DM (Warn)
  const warnEmbed = new EmbedBuilder()
    .setColor(0xffcc4d)
    .setTitle('⚠️ Automatische Verwarnung')
    .setDescription(
      `Du wurdest auf **${guild.name}** automatisch verwarnt.\n` +
      `📝 **Grund:** ${spam.reason}\n` +
      `⚠️ **Verwarnungen (letzte 30 Tage):** ${newWarnCount}`
    )
    .setTimestamp();
  await user.send({ embeds: [warnEmbed] }).catch(() => {});

  // Channel-Info
  const channelMsg = await message.channel
    .send({
      content: `⚠️ ${user} – deine Nachricht wurde entfernt: **${spam.reason}** (Verwarnung ${newWarnCount})`,
      allowedMentions: { users: [user.id] },
    })
    .catch(() => null);
  if (channelMsg) setTimeout(() => channelMsg.delete().catch(() => {}), 5_000);

  // Tracker zurücksetzen
  resetUser(guild.id, user.id);

  // ── Eskalation ────────────────────────────────────────────────────────────

  if (newWarnCount >= KICK_ON_WARN) {
    try {
      await member.kick(`[AutoMod] ${newWarnCount} Verwarnungen – Spam`);
    } catch (err) {
      console.error('[antispam] Kick fehlgeschlagen:', err);
      return;
    }

    client.emit('moderationAction', {
      guild,
      moderator: guild.members.me,
      targetUser: user,
      type: 'kick',
      reason: `[AutoMod] ${newWarnCount} Verwarnungen – Spam`,
      durationHuman: null,
      expiresAt: null,
      infraction: null,
    });

  } else if (newWarnCount >= TIMEOUT_ON_WARN) {
    const expiresAt = new Date(Date.now() + TIMEOUT_DURATION_MS);

    try {
      await member.timeout(TIMEOUT_DURATION_MS, `[AutoMod] ${newWarnCount} Verwarnungen – Spam`);
    } catch (err) {
      console.error('[antispam] Timeout fehlgeschlagen:', err);
      return;
    }

    let timeoutInfraction;
    try {
      timeoutInfraction = await Infraction.create({
        guildId: guild.id,
        userId: user.id,
        moderatorId: client.user.id,
        type: 'timeout',
        reason: `[AutoMod] ${newWarnCount} Verwarnungen – Spam`,
        durationSeconds: Math.floor(TIMEOUT_DURATION_MS / 1000),
        expiresAt,
      });
    } catch (err) {
      console.error('[antispam] Timeout-Infraction konnte nicht gespeichert werden:', err);
    }

    client.emit('moderationAction', {
      guild,
      moderator: guild.members.me,
      targetUser: user,
      type: 'timeout',
      reason: `[AutoMod] ${newWarnCount} Verwarnungen – Spam`,
      durationHuman: TIMEOUT_DURATION_HUMAN,
      expiresAt,
      infraction: timeoutInfraction,
    });

    const timeoutEmbed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('⏱️ Automatischer Timeout')
      .setDescription(
        `Du wurdest auf **${guild.name}** automatisch in Timeout gesetzt.\n` +
        `⏱️ **Dauer:** ${TIMEOUT_DURATION_HUMAN}\n` +
        `📝 **Grund:** Zu viele Spam-Verwarnungen (${newWarnCount})`
      )
      .setTimestamp();
    await user.send({ embeds: [timeoutEmbed] }).catch(() => {});
  }
}

// ── Haupt-Handler ─────────────────────────────────────────────────────────────

module.exports = async (client, message) => {
  try {
    if (!message.guild || !message.member) return;
    if (isExempt(message.member)) return;

    const { content } = message;
    const normalizedContent = content.toLowerCase().trim();

    // 1. Invite-Check
    if (BLOCK_INVITES) {
      const inviteMatch = content.match(INVITE_REGEX);
      if (inviteMatch) {
        const code = inviteMatch[1];
        const ownServer = await isOwnServerInvite(client, code);

        if (!ownServer) {
          // Fremder Server → Warn
          await handleSpam(client, message, {
            type: 'invite',
            reason: 'Fremder Discord-Invite-Link',
          });
          return;
        }
        // Eigener Server → durchlassen, nichts tun
        return;
      }
    }

    // 2. Externer Link-Check (still, kein Warn)
    const linkViolation = detectExternalLink(content);
    if (linkViolation) {
      await handleLinkViolation(message, linkViolation);
      return;
    }

    // 3. Spam-Check (Flood / Duplicate / Mention → Warn + Eskalation)
    const stats = trackMessage(message.guild.id, message.author.id, normalizedContent);
    const spam = detectSpam(message, stats);
    if (spam) {
      await handleSpam(client, message, spam);
    }

  } catch (err) {
    console.error('[antispam] Unerwarteter Fehler:', err);
  }
};