// Beim Bot-Start: alle User die bereits in Voice sitzen, in die joinMap eintragen.
// So gehen keine Minuten verloren wenn der Bot neustartet.

const { joinMap } = require('../voiceStateUpdate/statsTracker');

module.exports = async (client) => {
  try {
    let recovered = 0;
    const now = new Date();

    for (const guild of client.guilds.cache.values()) {
      // VoiceStates sind gecacht wenn GuildVoiceStates Intent aktiv ist
      for (const [, vs] of guild.voiceStates.cache) {
        if (!vs.channelId) continue;
        if (vs.member?.user?.bot) continue;

        const key = `${guild.id}:${vs.id}`;
        if (!joinMap.has(key)) {
          joinMap.set(key, { channelId: vs.channelId, joinedAt: now });
          recovered++;
        }
      }
    }

    if (recovered > 0) {
      console.log(`[voiceStatsRecovery] ${recovered} aktive Voice-Session(s) wiederhergestellt.`);
    }
  } catch (err) {
    console.error('[voiceStatsRecovery] Fehler:', err);
  }
};