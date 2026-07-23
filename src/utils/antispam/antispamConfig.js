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

  BLOCK_INVITES: true,
  BLOCK_EXTERNAL_LINKS: false,
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

  // ── Eskalation / Aktionen ────────────────────────────────────────────────────
  // Jeder Spam-Verstoß: Verwarnung + kurzer Timeout (Puffer) + Spam löschen.
  // Warns gelten für immer (kein Verfall). Ab KICK_ON_WARN wird gekickt.
  SPAM_TIMEOUT_MS: 10_000, // 10s Stummschaltung pro Verstoß (Puffer)
  SPAM_TIMEOUT_HUMAN: '10 Sekunden',
  KICK_ON_WARN: 4, // ab diesem Verstoß -> Kick


 // Nur AutoMod-Warns innerhalb dieses Fensters zählen für Eskalation/Kick.
  // Ältere Warns + manuelle Mod-Warns bleiben im Register, lösen aber keinen Auto-Kick aus.
  WARN_WINDOW_MS: 7 * 24 * 60 * 60 * 1000, // 7 Tage
  WARN_WINDOW_HUMAN: '7 Tage', // bei Änderung von WARN_WINDOW_MS mit anpassen

  
  // Synchroner Lock gegen Doppel-Strafen durch Discord-Latenz/Bursts.
  // Sollte <= SPAM_TIMEOUT_MS sein, damit nach dem Timeout ein neuer Verstoß greift.
  ACTION_LOCK_MS: 5_000,
};