const {
  Client,
  StringSelectMenuInteraction,
  MessageFlags,
} = require('discord.js');
const { REACTION_ROLES } = require('../../utils/reaktionRoles/boosterRolesConfig');

module.exports = {
  customId: 'boost_role_select_1',
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    const { member } = interaction;
    const selectedRoleId = interaction.values[0];

    // Alle Rollen aus Menü 1 holen
    const menu1Roles = REACTION_ROLES.filter(r => (r.menu ?? 1) === 1);

    // Prüfen ob der User noch boosted
    const isBoosting = !!member.premiumSinceTimestamp;
    if (!isBoosting) {
      return interaction.reply({
        content: '❌ Du musst den Server boosten, um eine Farbrolle zu erhalten.',
        ephemeral: true,
      });
    }

    // Alle anderen Menü-1-Rollen entfernen (außer der gewählten)
    for (const r of menu1Roles) {
      if (r.roleId !== selectedRoleId && member.roles.cache.has(r.roleId)) {
        await member.roles.remove(r.roleId, 'Boost-Farbrolle gewechselt').catch(() => null);
      }
    }

    // Gewählte Rolle hinzufügen
    if (!member.roles.cache.has(selectedRoleId)) {
      await member.roles.add(selectedRoleId, 'Boost-Farbrolle gewählt').catch(err => {
        console.error('[boostRoleSlct] Rolle hinzufügen fehlgeschlagen:', err);
      });
    }

    await interaction.reply({
      content: `✅ Deine Farbrolle wurde gesetzt!`,
      ephemeral: true,
    });
  },
};