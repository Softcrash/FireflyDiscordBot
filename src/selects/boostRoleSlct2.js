const {
  Client,
  StringSelectMenuInteraction,
  MessageFlags,
} = require('discord.js');
const { REACTION_ROLES } = require('../utils/reaktionRoles/boosterRolesConfig');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  customId: 'boost_role_select_2',
  devOnly: false,
  testMode: false,
  userPermissions: [],
  botPermissions: [],
  /**
   * @param {Client} client
   * @param {StringSelectMenuInteraction} interaction
   */
  run: async (client, interaction) => {
    const selectedRoleId = interaction.values[0];
    const { guild, member } = interaction;

    const mapping = REACTION_ROLES.find(r => r.roleId === selectedRoleId);
    if (!mapping) {
      return interaction.reply({
        content: '❌ Diese Rolle ist nicht (mehr) verfügbar.',
        ...EPHEMERAL,
      });
    }

    const role =
      guild.roles.cache.get(selectedRoleId) ??
      (await guild.roles.fetch(selectedRoleId).catch(() => null));
    if (!role) {
      return interaction.reply({
        content: '❌ Die Rolle existiert nicht (mehr) auf diesem Server.',
        ...EPHEMERAL,
      });
    }

    const isBoosting = !!member.premiumSinceTimestamp;
    if (!isBoosting) {
      return interaction.reply({
        content: '❌ Du musst den Server boosten, um eine Farbrolle zu erhalten.',
        ...EPHEMERAL,
      });
    }

    try {
      // Alle anderen Menü-2-Rollen entfernen
      const menu2Roles = REACTION_ROLES.filter(r => r.menu === 2);
      for (const r of menu2Roles) {
        if (r.roleId !== selectedRoleId && member.roles.cache.has(r.roleId)) {
          await member.roles.remove(r.roleId, 'Boost-Farbrolle gewechselt').catch(() => null);
        }
      }

      await member.roles.add(selectedRoleId, 'Boost-Panel: Rolle ausgewählt');
      await interaction.reply({
        content: `➕ Rolle ${role} wurde **hinzugefügt**.`,
        ...EPHEMERAL,
      });
      return interaction.message.suppressEmbeds(false);
    } catch (err) {
      console.error('[boost_role_select] Konnte Rolle nicht ändern:', err);
      return interaction.reply({
        content: '❌ Konnte die Rolle nicht ändern. Steht meine Bot-Rolle in der Hierarchie *über* der zu vergebenden Rolle und habe ich `Manage Roles`?',
        ...EPHEMERAL,
      });
    }
  },
};