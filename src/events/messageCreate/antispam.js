const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Infraction } = require('../../database/registry');
const {
  trackMessage,
  collectMessages,
  isActionLocked,
  markActioned,
} = require('../../utils/antispam/spamTracker');
const {
  FLOOD_MSG_COUNT,
  DUPLICATE_COUNT,
  DUPLICATE_MIN_LENGTH,
  MENTION_LIMIT,
  OWN_GUILD_ID,
  BLOCK_INVITES,
  BLOCK_EXTERNAL_LINKS,
  ALLOWED_DOMAINS,
  SPAM_TIMEOUT_MS,
  SPAM_TIMEOUT_HUMAN,
  KICK_ON_WARN,
  WARN_WINDOW_MS,
  WARN_WINDOW_HUMAN,
} = require('../../utils/antispam/antispamConfig');
const { Op } = require('sequelize');

// ── Regex ─────────────────────────────────────────────────────────────────────
const INVITE_REGEX = /discord(?:\.gg|(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/i;
const URL_REGEX = /https?:\/\/([a-zA-Z0-9.-]+)/gi;

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function isExempt(member) {
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
 * @returns {Promise<boolean>}  true = eigener Server (durchlassen)
 */
async function isOwnServerInvite(client, code) {
  try {
    const invite = await client.fetchInvite(code);
    return invite?.guild?.id === OWN_GUILD_ID;
  } catch {
    return false; // ungültig/abgelaufen → als fremd behandeln
  }
}

/**
 * Stiller Link-Verstoß (löschen + Info, KEIN Warn). Nur externe Links.
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
 * Spam-Erkennung (Flood / Duplicate / Mention → Warn + Eskalation).
 * @returns {{ type: string, reason: string } | null}
 */
function detectSpam(message, stats) {
  const content = message.content ?? '';

  const mentionCount =
    message.mentions.users.size +
    message.mentions.roles.size +
    (message.mentions.everyone ? 1 : 0);
  if (mentionCount >= MENTION_LIMIT) {
    return { type: 'mention', reason: `Mention-Spam (${mentionCount} Mentions)` };
  }

  const normalizedContent = content.toLowerCase().trim();
  if (normalizedContent.length >= DUPLICATE_MIN_LENGTH && stats.duplicateCount >= DUPLICATE_COUNT) {
    return { type: 'duplicate', reason: `Duplicate-Spam (${stats.duplicateCount}x gleiche Nachricht)` };
  }

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

// ── Nachrichten löschen (Burst, kanalübergreifend) ────────────────────────────

async function purgeMessages(guild, byChannel) {
  for (const [channelId, ids] of byChannel) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel?.isTextBased?.()) continue;
    // bulkDelete: max. 100/Call, filterOld überspringt >14 Tage alte Nachrichten
    for (let i = 0; i < ids.length; i += 100) {
      await channel.bulkDelete(ids.slice(i, i + 100), true).catch(() => {});
    }
  }
}

// ── Warn + Eskalation ─────────────────────────────────────────────────────────

/**
 * Führt die Strafe aus: Spam löschen, Warn speichern, dann entweder
 * 10s-Timeout (Standard) oder Kick (ab KICK_ON_WARN).
 * Wird NUR über `triggerSpamAction` aufgerufen (synchroner Lock davor).
 *
 * @param {Map<string, string[]>|null} spamMessages  Burst (channelId -> IDs) oder null
 */
async function handleSpam(client, message, spam, spamMessages) {
  const { guild, member, author: user } = message;

  // Spam löschen (ganzer Burst, sonst nur die auslösende Nachricht)
  if (spamMessages && spamMessages.size > 0) {
    await purgeMessages(guild, spamMessages);
  } else {
    await message.delete().catch(() => {});
  }

  const warnCount = await Infraction.count({
    where: {
      guildId: guild.id,
      userId: user.id,
      type: 'warn',
      moderatorId: client.user.id, // nur vom Bot
      createdAt: { [Op.gte]: new Date(Date.now() - WARN_WINDOW_MS) },
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

  // ── Eskalation: Kick ────────────────────────────────────────────────────────
  if (newWarnCount >= KICK_ON_WARN) {
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

    const kickEmbed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('👢 Automatischer Kick')
      .setDescription(
        `Du wurdest von **${guild.name}** gekickt.\n` +
          `📝 **Grund:** Zu viele Spam-Verwarnungen (${newWarnCount})`
      )
      .setTimestamp();
    await user.send({ embeds: [kickEmbed] }).catch(() => {}); // DM vor dem Kick zustellen

    if (member.kickable) {
      await member
        .kick(`[AutoMod] ${newWarnCount} Verwarnungen – Spam`)
        .catch((err) => console.error('[antispam] Kick fehlgeschlagen:', err));
    } else {
      console.error('[antispam] Kick nicht möglich (Hierarchie/Rechte):', user.tag);
    }
    return;
  }

  // ── Standard: Warn + 10s-Timeout ──────────────────────────────────────────────
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

  // Kurzer Timeout als Puffer (Enforcement, kein eigener Strafregister-Eintrag)
  if (member.moderatable) {
    await member
      .timeout(SPAM_TIMEOUT_MS, `[AutoMod] ${spam.reason}`)
      .catch((err) => console.error('[antispam] Timeout fehlgeschlagen:', err));
  }

  // DM (Warn + Timeout)
  const warnEmbed = new EmbedBuilder()
    .setColor(0xffcc4d)
    .setTitle('⚠️ Automatische Verwarnung')
    .setDescription(
      `Du wurdest auf **${guild.name}** automatisch verwarnt und für ` +
        `**${SPAM_TIMEOUT_HUMAN}** stummgeschaltet.\n` +
        `📝 **Grund:** ${spam.reason}\n` +
        `⚠️ **AutoMod-Verwarnungen (${WARN_WINDOW_HUMAN}):** ${newWarnCount}`
    )
    .setTimestamp();
  await user.send({ embeds: [warnEmbed] }).catch(() => {});

  // Channel-Info (kurz, verschwindet nach 5s)
  const channelMsg = await message.channel
    .send({
      content: `⚠️ ${user} – Spam erkannt: **${spam.reason}** · ${SPAM_TIMEOUT_HUMAN} Timeout · Verwarnung ${newWarnCount}`,
      allowedMentions: { users: [user.id] },
    })
    .catch(() => null);
  if (channelMsg) setTimeout(() => channelMsg.delete().catch(() => {}), 5_000);
}

/**
 * Synchroner Lock + Auslösung. Zwischen `isActionLocked` und `markActioned`
 * darf KEIN await stehen — nur so verhindert der Lock zuverlässig Doppel-Strafen
 * bei mehreren fast gleichzeitig eintreffenden Spam-Nachrichten.
 *
 * @param {{ collectBurst?: boolean }} [opts]  Burst-Löschung nur bei echtem Spam
 */
async function triggerSpamAction(client, message, spam, { collectBurst = false } = {}) {
  const { guild, author: user } = message;

  if (isActionLocked(guild.id, user.id)) {
    await message.delete().catch(() => {}); // Spam trotzdem entfernen, aber keine zweite Strafe
    return;
  }
  const spamMessages = collectBurst ? collectMessages(guild.id, user.id) : null;
  markActioned(guild.id, user.id);

  await handleSpam(client, message, spam, spamMessages);
}

// ── Haupt-Handler ─────────────────────────────────────────────────────────────

module.exports = async (client, message) => {
  try {
    if (!message.guild || !message.member) return;
    if (isExempt(message.member)) return;

    const content = message.content ?? '';
    const normalizedContent = content.toLowerCase().trim();

    // 1. Invite-Check (fremder Server → Warn)
    if (BLOCK_INVITES) {
      const inviteMatch = content.match(INVITE_REGEX);
      if (inviteMatch) {
        const code = inviteMatch[1];
        const ownServer = await isOwnServerInvite(client, code);
        if (!ownServer) {
          await triggerSpamAction(client, message, {
            type: 'invite',
            reason: 'Fremder Discord-Invite-Link',
          });
        }
        return; // eigener Invite → durchlassen
      }
    }

    // 2. Externer Link-Check (still, kein Warn)
    const linkViolation = detectExternalLink(content);
    if (linkViolation) {
      await handleLinkViolation(message, linkViolation);
      return;
    }

    // 3. Spam-Check (Flood / Duplicate / Mention → Warn + 10s-Timeout + Eskalation)
    const stats = trackMessage(
      message.guild.id,
      message.author.id,
      normalizedContent,
      message.id,
      message.channelId
    );
    const spam = detectSpam(message, stats);
    if (spam) {
      await triggerSpamAction(client, message, spam, { collectBurst: true });
    }
  } catch (err) {
    console.error('[antispam] Unerwarteter Fehler:', err);
  }
};