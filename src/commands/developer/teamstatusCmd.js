'use strict';

// FILE: src/commands/developer/teamstatusCmd.js
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

  // Signatur an cmdValidator angepasst: (client, interaction)
  run: async (client, interaction) => {
    // Ephemer deferren: members.fetch() kann >3s dauern, und das
    // CV2-Flag darf nicht auf einen deferred Reply gesetzt werden.
    // Daher: Panel als eigenständige Kanalnachricht senden.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let collected;
    try {
      collected = await panel.collectTeamMembers(interaction.guild);
    } catch (err) {
      console.error('[teamstatus] Mitglieder-Fetch fehlgeschlagen:', err);
      return interaction.editReply({
        content: '⚠️ Konnte die Mitglieder gerade nicht laden (evtl. Rate-Limit). Bitte gleich erneut versuchen.',
      });
    }

    const { roleIds, members } = collected;
    if (!roleIds.length) {
      return interaction.editReply({
        content: '⚠️ Es sind keine Teamrollen hinterlegt. Trage sie in `getTeamRoleIds` (teamstatusPanel.js) ein.',
      });
    }

    // Startzustand: alle gefundenen Teamler auf Default-Status
    const state = new Map();
    for (const id of members) state.set(id, { status: panel.DEFAULT_STATUS, period: null });

    await interaction.channel.send(panel.panelPayload(state));
    return interaction.editReply({ content: '✅ Teamstatus-Panel wurde erstellt.' });
  },
};