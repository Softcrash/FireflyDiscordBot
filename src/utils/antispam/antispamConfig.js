/**
 * Antispam Konfiguration
 * Alle Schwellenwerte und Einstellungen zentral hier anpassen.
 */

module.exports = {
  // ── Flood-Erkennung ─────────────────────────────────────────────────────────
  FLOOD_MSG_COUNT: 5,
  FLOOD_WINDOW_MS: 5_000,

  // ── Duplicate-Erkennung ──────────────────────────────────────────────────────
  DUPLICATE_COUNT: 3,
  DUPLICATE_WINDOW_MS: 10_000,
  DUPLICATE_MIN_LENGTH: 5,

  // ── Mention-Spam ─────────────────────────────────────────────────────────────
  MENTION_LIMIT: 5,

  // ── Invite / Link Filter ─────────────────────────────────────────────────────
  // Eigene Guild-ID — Invites zu diesem Server werden NICHT gelöscht/gewarnt
  OWN_GUILD_ID: '1491382344655962135',

  // Fremde Discord-Invite-Links → löschen + Warn
  BLOCK_INVITES: true,
  // Externe Links → löschen + stille Info (kein Warn)
  BLOCK_EXTERNAL_LINKS: true,
  // Whitelisted Domains – diese Links dürfen gepostet werden
  ALLOWED_DOMAINS: [
    'discord.com',
    'discordapp.com',
    'cdn.discordapp.com',
    'media.discordapp.net',
    'tenor.com',
    'media.tenor.com',
    'giphy.com',
    'media.giphy.com',
    'imgur.com',
    'i.imgur.com',
    'youtube.com',
    'youtu.be',
    'twitch.tv',
    'clips.twitch.tv',
  ],

  // ── Tracker Cleanup ──────────────────────────────────────────────────────────
  CLEANUP_INTERVAL_MS: 60_000,

  // ── Eskalations-Stufen ───────────────────────────────────────────────────────
  // Warns gelten für immer (kein Verfall)

  TIMEOUT_ON_WARN: 3,
  TIMEOUT_DURATION_MS: 10 * 60 * 1000,
  TIMEOUT_DURATION_HUMAN: '10 Minuten',
  KICK_ON_WARN: 4,
};