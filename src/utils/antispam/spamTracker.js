const {
  FLOOD_WINDOW_MS,
  DUPLICATE_WINDOW_MS,
  CLEANUP_INTERVAL_MS,
} = require('./antispamConfig');

/**
 * In-Memory Tracker für den Antispam-Handler.
 *
 * Struktur pro User (Key: `${guildId}:${userId}`):
 *   {
 *     messages:   Array<{ content: string, timestamp: number }>,  // für Flood + Duplicate
 *   }
 *
 * Der Tracker wird regelmäßig von abgelaufenen Einträgen bereinigt.
 */

/** @type {Map<string, { messages: Array<{ content: string, timestamp: number }> }>} */
const tracker = new Map();

/**
 * Gibt den Tracker-Eintrag für einen User zurück (erstellt ihn falls nötig).
 * @param {string} guildId
 * @param {string} userId
 */
function getEntry(guildId, userId) {
  const key = `${guildId}:${userId}`;
  if (!tracker.has(key)) {
    tracker.set(key, { messages: [] });
  }
  return tracker.get(key);
}

/**
 * Registriert eine neue Nachricht für den User und gibt aktuelle Stats zurück.
 *
 * @param {string} guildId
 * @param {string} userId
 * @param {string} content  Normalisierter Nachrichteninhalt (lowercase, trimmed)
 * @returns {{ floodCount: number, duplicateCount: number }}
 */
function trackMessage(guildId, userId, content) {
  const entry = getEntry(guildId, userId);
  const now = Date.now();

  // Neue Nachricht hinzufügen
  entry.messages.push({ content, timestamp: now });

  // Veraltete Einträge entfernen (außerhalb des längsten Fensters)
  const maxWindow = Math.max(FLOOD_WINDOW_MS, DUPLICATE_WINDOW_MS);
  entry.messages = entry.messages.filter((m) => now - m.timestamp <= maxWindow);

  // Flood: Anzahl aller Nachrichten im Flood-Fenster
  const floodCount = entry.messages.filter((m) => now - m.timestamp <= FLOOD_WINDOW_MS).length;

  // Duplicate: Anzahl identischer Nachrichten im Duplicate-Fenster
  const duplicateCount = entry.messages.filter(
    (m) => now - m.timestamp <= DUPLICATE_WINDOW_MS && m.content === content
  ).length;

  return { floodCount, duplicateCount };
}

/**
 * Setzt den Tracker-Eintrag eines Users zurück (z.B. nach einer Aktion).
 * @param {string} guildId
 * @param {string} userId
 */
function resetUser(guildId, userId) {
  tracker.delete(`${guildId}:${userId}`);
}

// ── Periodischer Cleanup ──────────────────────────────────────────────────────
// Entfernt User-Einträge, deren Nachrichten alle abgelaufen sind,
// damit die Map nicht unbegrenzt wächst.
setInterval(() => {
  const now = Date.now();
  const maxWindow = Math.max(FLOOD_WINDOW_MS, DUPLICATE_WINDOW_MS);

  for (const [key, entry] of tracker.entries()) {
    entry.messages = entry.messages.filter((m) => now - m.timestamp <= maxWindow);
    if (entry.messages.length === 0) {
      tracker.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

module.exports = { trackMessage, resetUser };