const { VoiceStat } = require('../../database/registry');

const joinMap = new Map();

async function flushVoiceTime(guildId, userId, channelId, joinedAt, leftAt = new Date()) {
  const totalMs      = leftAt - joinedAt;
  const totalMinutes = Math.floor(totalMs / 60_000);
  if (totalMinutes < 1) return; // Unter 1 Minute: nicht speichern

  const date = joinedAt.toISOString().slice(0, 10);

  // findOrCreate legt die Tageszeile bei der ersten Session direkt mit den Minuten an.
  // Existiert sie schon: atomar erhöhen. Unique-Index macht parallele Events race-safe.
  const [, created] = await VoiceStat.findOrCreate({
    where:    { guildId, userId, channelId, date },
    defaults: { guildId, userId, channelId, date, minutes: totalMinutes },
  });

  if (!created) {
    await VoiceStat.increment('minutes', {
      by: totalMinutes,
      where: { guildId, userId, channelId, date },
    });
  }
}

module.exports = async (client, oldState, newState) => {
  try {
    const userId  = newState.id;
    const guildId = newState.guild.id;

    if (newState.member?.user?.bot) return;

    const key   = `${guildId}:${userId}`;
    const oldCh = oldState.channelId;
    const newCh = newState.channelId;

    // ── User hat Voice betreten ──────────────────────────────────────────────
    if (!oldCh && newCh) {
      joinMap.set(key, { channelId: newCh, joinedAt: new Date() });
      return;
    }

    // ── User hat Voice verlassen ─────────────────────────────────────────────
    if (oldCh && !newCh) {
      const entry = joinMap.get(key);
      if (entry) {
        // SOFORT entfernen, bevor await — verhindert doppeltes Verbuchen.
        joinMap.delete(key);
        await flushVoiceTime(guildId, userId, entry.channelId, entry.joinedAt);
      }
      return;
    }

    // ── User hat den Channel gewechselt ──────────────────────────────────────
    if (oldCh && newCh && oldCh !== newCh) {
      const entry = joinMap.get(key);
      const now   = new Date();
      // Neuen Eintrag SOFORT setzen (synchron), bevor await läuft.
      joinMap.set(key, { channelId: newCh, joinedAt: now });
      if (entry) {
        await flushVoiceTime(guildId, userId, entry.channelId, entry.joinedAt, now);
      }
    }
  } catch (err) {
    console.error('[statsTracker/voice] Fehler:', err);
  }
};

module.exports.joinMap = joinMap;