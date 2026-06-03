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

    // Sicherstellen, dass die Rolle aus unserer Config kommt (kein Spoofing)
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

    try {
      if (member.roles.cache.has(selectedRoleId)) {
        await member.roles.remove(selectedRoleId, 'Boost-Panel: Rolle abgewählt');
        await interaction.reply({
          content: `➖ Rolle ${role} wurde **entfernt**.`,
          ...EPHEMERAL,
        });
        return interaction.message.suppressEmbeds(false);
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