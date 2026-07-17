// FILE: src/selects/boosterSlct.js
const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const { REACTION_ROLES } = require('../utils/reaktionRoles/boosterRolesConfig');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  // smValidator: startsWith('boost_role_select_') → matcht Menü 1 UND Menü 2.
  // Welches Menü es war, ist egal — es zählt nur die gewählte roleId.
  customIdPrefix: 'boost_role_select_',
  botPermissions: [PermissionFlagsBits.ManageRoles],

  run: async (client, interaction) => {
    const roleId = interaction.values[0];

    // Sicherheitscheck: nur Rollen aus der Config zulassen
    const configRole = REACTION_ROLES.find(r => r.roleId === roleId);
    if (!configRole) {
      return interaction.reply({
        content: '❌ Diese Rolle ist nicht (mehr) konfiguriert.',
        ...EPHEMERAL,
      });
    }

    await interaction.deferReply(EPHEMERAL);
    const member = interaction.member;

    try {
      // Erneut dieselbe Rolle gewählt → Toggle: Rolle entfernen
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.editReply({
          content: `✅ ${configRole.emoji} **${configRole.label}** wurde entfernt.`,
          allowedMentions: { parse: [] },
        });
      }

      // Alle anderen Boost-Rollen (aus BEIDEN Menüs) abräumen — nur eine Farbe gleichzeitig
      const toRemove = REACTION_ROLES
        .map(r => r.roleId)
        .filter(id => id !== roleId && member.roles.cache.has(id));
      if (toRemove.length) await member.roles.remove(toRemove);

      await member.roles.add(roleId);
      return interaction.editReply({
        content: `✅ Du hast jetzt ${configRole.emoji} **${configRole.label}**.`,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error('[boosterSlct] Rollen-Update fehlgeschlagen:', err);
      return interaction.editReply({
        content: '❌ Konnte die Rolle nicht ändern. Steht meine Bot-Rolle über den Boost-Rollen?',
      });
    }
  },
};