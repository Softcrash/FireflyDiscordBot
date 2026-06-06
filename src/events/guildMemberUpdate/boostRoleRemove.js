const { REACTION_ROLES } = require('../../utils/reaktionRoles/boosterRolesConfig');

module.exports = async (client, oldMember, newMember) => {
  // War vorher Booster, ist jetzt keiner mehr
  const wasBooster = !!oldMember.premiumSinceTimestamp;
  const isBooster  = !!newMember.premiumSinceTimestamp;

  if (!wasBooster || isBooster) return; // Kein Boost-Verlust → nichts tun

  const allBoostRoleIds = REACTION_ROLES.map(r => r.roleId);

  for (const roleId of allBoostRoleIds) {
    if (newMember.roles.cache.has(roleId)) {
      await newMember.roles.remove(roleId, 'Boost abgelaufen — Farbrolle entfernt').catch(err => {
        console.error('[boostRoleRemove] Rolle entfernen fehlgeschlagen:', err);
      });
    }
  }
};