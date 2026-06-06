const {
  Client,
  StringSelectMenuInteraction,
  MessageFlags,
} = require('discord.js');
const { PING_ROLES } = require('../utils/dreamy/dreamyConfig');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  customId: 'dreamy_role_select',
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
    const mapping = PING_ROLES.find((r) => r.roleId === selectedRoleId);
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
        await member.roles.remove(selectedRoleId, 'Dreamy-Panel: Ping-Rolle abgewählt');
        return interaction.reply({
          content: `➖ Rolle ${role} wurde **entfernt**.`,
          ...EPHEMERAL,
        });
      }

      await member.roles.add(selectedRoleId, 'Dreamy-Panel: Ping-Rolle ausgewählt');
      return interaction.reply({
        content: `➕ Rolle ${role} wurde **hinzugefügt**.`,
        ...EPHEMERAL,
      });
    } catch (err) {
      console.error('[dreamy_role_select] Konnte Rolle nicht ändern:', err);
      return interaction.reply({
        content:
          '❌ Konnte die Rolle nicht ändern. Steht meine Bot-Rolle in der Hierarchie *über* der zu vergebenden Rolle und habe ich `Manage Roles`?',
        ...EPHEMERAL,
      });
    }
  },
};