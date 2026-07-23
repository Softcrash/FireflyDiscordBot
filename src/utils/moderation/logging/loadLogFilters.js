require('colors');

const { PermissionFlagsBits } = require('discord.js');
const { loadAll } = require('../../utils/moderation/logging/logFilter');

module.exports = async (client) => {
  try {
    const count = await loadAll();
    console.log(`[logging] ${count} Log-Filter geladen`);
  } catch (err) {
    console.error('[logging] Filter-Load fehlgeschlagen (Fail-Open aktiv):', err);
  }

  for (const guild of client.guilds.cache.values()) {
    const me = guild.members.me;
    if (!me?.permissions?.has(PermissionFlagsBits.ViewAuditLog)) {
      console.warn(
        `[logging] ⚠️ ${guild.name} (${guild.id}): "Audit-Log anzeigen" fehlt — Ausführende können nicht ermittelt werden.`.yellow
      );
    }
  }
};