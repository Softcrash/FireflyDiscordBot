const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
} = require('discord.js');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('teamlist-setup')
    .setDescription('Erstellt eine automatische Team-Liste in diesem Kanal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  // Auf true setzen, wenn der Command nur von dir (developersId) nutzbar sein soll:
  devOnly: true,
  testMode: false,

  run: async (client, interaction) => {
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId('teamlist_role_select')
      .setPlaceholder('Wähle alle Team-Rollen aus...')
      .setMinValues(1)
      .setMaxValues(25);

    const row = new ActionRowBuilder().addComponents(roleSelect);

    await interaction.reply({
      content:
        '👥 **Team-Liste einrichten**\n' +
        'Wähle unten **alle Rollen** aus, die in der Team-Liste angezeigt werden sollen.\n' +
        'Die Reihenfolge richtet sich automatisch nach der Rollen-Hierarchie ' +
        '(höchste Rolle zuerst). Nach der Auswahl wird das Panel in diesen Kanal gepostet.',
      components: [row],
      ...EPHEMERAL,
    });
  },
};