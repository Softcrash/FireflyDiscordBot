const {
  FLOOD_WINDOW_MS,
  DUPLICATE_WINDOW_MS,
  CLEANUP_INTERVAL_MS,
  ACTION_LOCK_MS,
} = require('./antispamConfig');

/**
 * In-Memory Tracker für den Antispam-Handler.
 *
 * Struktur pro User (Key: `${guildId}:${userId}`):
 *   {
 *     messages:     Array<{ id, channelId, content, timestamp }>,  // Flood + Duplicate + Löschen
 *     lastActionAt: number,                                        // Lock gegen Doppel-Strafen
 *   }
 */

/** @type {Map<string, { messages: Array<{ id: string, channelId: string, content: string, timestamp: number }>, lastActionAt: number }>} */
const tracker = new Map();

function getEntry(guildId, userId) {
  const key = `${guildId}:${userId}`;
  if (!tracker.has(key)) {
    tracker.set(key, { messages: [], lastActionAt: 0 });
  }
  return tracker.get(key);
}

/**
 * Registriert eine neue Nachricht und gibt aktuelle Stats zurück.
 * @returns {{ floodCount: number, duplicateCount: number }}
 */
function trackMessage(guildId, userId, content, messageId, channelId) {
  const entry = getEntry(guildId, userId);
  const now = Date.now();

  entry.messages.push({ id: messageId, channelId, content, timestamp: now });

  const maxWindow = Math.max(FLOOD_WINDOW_MS, DUPLICATE_WINDOW_MS);
  entry.messages = entry.messages.filter((m) => now - m.timestamp <= maxWindow);

  const floodCount = entry.messages.filter((m) => now - m.timestamp <= FLOOD_WINDOW_MS).length;
  const duplicateCount = entry.messages.filter(
    (m) => now - m.timestamp <= DUPLICATE_WINDOW_MS && m.content === content
  ).length;

  return { floodCount, duplicateCount };
}

/**
 * Sammelt alle aktuell gepufferten Nachrichten des Users, gruppiert nach Channel.
 * Vor `markActioned` aufrufen (dieses leert den Puffer).
 * @returns {Map<string, string[]>}  channelId -> Array von Message-IDs
 */
function collectMessages(guildId, userId) {
  const entry = getEntry(guildId, userId);
  const byChannel = new Map();
  for (const m of entry.messages) {
    if (!m.id || !m.channelId) continue;
    if (!byChannel.has(m.channelId)) byChannel.set(m.channelId, []);
    byChannel.get(m.channelId).push(m.id);
  }
  return byChannel;
}

/**
 * Prüft, ob aktuell ein Aktions-Lock aktiv ist.
 * Solange `true`, KEINE weitere Strafe auslösen (dedupliziert denselben Burst trotz
 * Discord-Latenz). Muss synchron direkt vor `markActioned` geprüft werden.
 * @returns {boolean}
 */
function isActionLocked(guildId, userId) {
  const entry = getEntry(guildId, userId);
  return Date.now() - entry.lastActionAt < ACTION_LOCK_MS;
}

/**
 * Markiert eine soeben ausgeführte Aktion: setzt den Lock und leert den
 * Nachrichten-Puffer (Zähler startet neu, Lock bleibt bestehen).
 */
function markActioned(guildId, userId) {
  const entry = getEntry(guildId, userId);
  entry.lastActionAt = Date.now();
  entry.messages = [];
}

/**
 * Setzt den kompletten Tracker-Eintrag zurück.
 */
function resetUser(guildId, userId) {
  tracker.delete(`${guildId}:${userId}`);
}

// ── Periodischer Cleanup ──────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  const maxWindow = Math.max(FLOOD_WINDOW_MS, DUPLICATE_WINDOW_MS);

  for (const [key, entry] of tracker.entries()) {
    entry.messages = entry.messages.filter((m) => now - m.timestamp <= maxWindow);
    if (entry.messages.length === 0 && now - entry.lastActionAt > ACTION_LOCK_MS) {
      tracker.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

module.exports = { trackMessage, collectMessages, isActionLocked, markActioned, resetUser };