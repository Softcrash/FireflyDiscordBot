const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const panel = require('../../utils/teamstatusPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('teamstatus')
    .setDescription('Postet das Teamstatus-Panel in diesen Kanal.')
    .setDMPermission(false),

  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  devOnly: false,

  run: async (interaction, client) => {
    let collected;
    try {
      collected = await panel.collectTeamMembers(interaction.guild);
    } catch (err) {
      console.error('[teamstatus] Mitglieder-Fetch fehlgeschlagen:', err);
      return interaction.reply({
        content: '⚠️ Konnte die Mitglieder gerade nicht laden (evtl. Rate-Limit). Bitte gleich erneut versuchen.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const { roleIds, members } = collected;
    if (!roleIds.length) {
      return interaction.reply({
        content: '⚠️ Es sind keine Teamrollen hinterlegt. Trage sie in `getTeamRoleIds` (teamstatusPanel.js) ein.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Startzustand: alle gefundenen Teamler auf Default-Status
    const state = new Map();
    for (const id of members) state.set(id, { status: panel.DEFAULT_STATUS, period: null });

    return interaction.reply(panel.panelPayload(state));
  },
};