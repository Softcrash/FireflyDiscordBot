const {
  Client,
  StringSelectMenuInteraction,
  MessageFlags,
} = require('discord.js');
const { REACTION_ROLES } = require('../../utils/reaktionRoles/boosterRolesConfig');

module.exports = {
  customId: 'boost_role_select_2', 
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    const { member } = interaction;
    const selectedRoleId = interaction.values[0];

    // Alle Rollen aus Menü 2 holen
    const menu2Roles = REACTION_ROLES.filter(r => r.menu === 2);  // ← geändert

    const isBoosting = !!member.premiumSinceTimestamp;
    if (!isBoosting) {
      return interaction.reply({
        content: '❌ Du musst den Server boosten, um eine Farbrolle zu erhalten.',
        ephemeral: true,
      });
    }

    // Alle anderen Menü-2-Rollen entfernen (außer der gewählten)
    for (const r of menu2Roles) {  
      if (r.roleId !== selectedRoleId && member.roles.cache.has(r.roleId)) {
        await member.roles.remove(r.roleId, 'Boost-Farbrolle gewechselt').catch(() => null);
      }
    }

    if (!member.roles.cache.has(selectedRoleId)) {
      await member.roles.add(selectedRoleId, 'Boost-Farbrolle gewählt').catch(err => {
        console.error('[boostRoleSlct2] Rolle hinzufügen fehlgeschlagen:', err);
      });
    }

    await interaction.reply({
      content: `✅ Deine Farbrolle wurde gesetzt!`,
      ephemeral: true,
    });
  },
};