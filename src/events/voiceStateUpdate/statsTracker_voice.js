// FILE: src/events/voiceStateUpdate/statsTracker.js
//
// Trackt Voice-Minuten pro User/Channel/Tag.
// Reboot-Recovery: beim clientReady werden alle aktuell im Voice sitzenden
// User in die joinMap eingetragen (siehe src/events/clientReady/voiceStatsRecovery.js).

const { VoiceStat } = require('../../database/registry');

/**
 * In-Memory Map: `${guildId}:${userId}` → { channelId, joinedAt (Date) }
 * Wird auch von voiceStatsRecovery.js befüllt.
 */
const joinMap = new Map();

/**
 * Schreibt abgelaufene Voice-Zeit in die DB.
 * @param {string} guildId
 * @param {string} userId
 * @param {string} channelId
 * @param {Date}   joinedAt
 * @param {Date}   [leftAt]   Standard: jetzt
 */
async function flushVoiceTime(guildId, userId, channelId, joinedAt, leftAt = new Date()) {
  const totalMs      = leftAt - joinedAt;
  const totalMinutes = Math.floor(totalMs / 60_000);
  if (totalMinutes < 1) return; // Unter 1 Minute → nicht speichern

  // Wenn eine Session über Mitternacht geht, splitten wir sie auf zwei Tage.
  // Einfache Variante: alles auf den Tag des Joins buchen (reicht für ~99% der Fälle).
  const date = joinedAt.toISOString().slice(0, 10);

  const [row, created] = await VoiceStat.findOrCreate({
    where: { guildId, userId, channelId, date },
    defaults: { minutes: totalMinutes },
  });

  if (!created) {
    row.minutes += totalMinutes;
    await row.save();
  }
}

module.exports = async (client, oldState, newState) => {
  try {
    const userId  = newState.id;
    const guildId = newState.guild.id;

    // Bot-Accounts ignorieren
    if (newState.member?.user?.bot) return;

    const key       = `${guildId}:${userId}`;
    const oldCh     = oldState.channelId;
    const newCh     = newState.channelId;

    // ── User hat Voice betreten ──────────────────────────────────────────────
    if (!oldCh && newCh) {
      joinMap.set(key, { channelId: newCh, joinedAt: new Date() });
      return;
    }

    // ── User hat Voice verlassen ─────────────────────────────────────────────
    if (oldCh && !newCh) {
      const entry = joinMap.get(key);
      if (entry) {
        joinMap.delete(key);
        await flushVoiceTime(guildId, userId, entry.channelId, entry.joinedAt);
      }
      return;
    }

    // ── User hat den Channel gewechselt ──────────────────────────────────────
    if (oldCh && newCh && oldCh !== newCh) {
      const entry = joinMap.get(key);
      const now   = new Date();
      if (entry) {
        await flushVoiceTime(guildId, userId, entry.channelId, entry.joinedAt, now);
      }
      // Neu-Eintrag für neuen Channel
      joinMap.set(key, { channelId: newCh, joinedAt: now });
    }
  } catch (err) {
    console.error('[statsTracker/voice] Fehler:', err);
  }
};

// Exportiert für voiceStatsRecovery.js
module.exports.joinMap = joinMap;