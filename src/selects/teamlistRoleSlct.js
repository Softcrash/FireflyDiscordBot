const { Client, RoleSelectMenuInteraction, MessageFlags } = require('discord.js');
const { TeamlistSetup } = require('../database/registry');
const { buildTeamlistContainer } = require('../utils/teamlist/teamlistBuilder');

module.exports = {
  customId: 'teamlist_role_select',
  devOnly: false,
  testMode: false,
  userPermissions: [],
  botPermissions: [],
  /**
   * @param {Client} client
   * @param {RoleSelectMenuInteraction} interaction
   */
  run: async (client, interaction) => {
    // Member-Fetch + DB können dauern → Interaction sofort acknowledgen.
    await interaction.deferUpdate();

    const roleIds = interaction.values; // Array der ausgewählten Rollen-IDs
    const { guild } = interaction;

    // Panel bauen
    let container;
    try {
      container = await buildTeamlistContainer(guild, roleIds);
    } catch (err) {
      console.error('[teamlist] Container bauen fehlgeschlagen:', err);
      return interaction.editReply({
        content: '❌ Die Team-Liste konnte nicht erstellt werden.',
        components: [],
      });
    }

    // Panel in den Kanal posten (allowedMentions: parse [] → pingt niemanden)
    let panelMessage;
    try {
      panelMessage = await interaction.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error('[teamlist] Panel senden fehlgeschlagen:', err);
      return interaction.editReply({
        content: '❌ Konnte das Panel nicht senden. Habe ich Schreibrechte in diesem Kanal?',
        components: [],
      });
    }

    // Setup speichern (inkl. Message-ID für den Refresh-Button)
    try {
      await TeamlistSetup.upsert({
        guildId: guild.id,
        channelId: panelMessage.channelId,
        messageId: panelMessage.id,
        roleIds,
      });
    } catch (err) {
      console.error('[teamlist] Setup konnte nicht gespeichert werden:', err);
      // Panel steht trotzdem — Refresh würde nur ohne DB-Eintrag nicht klappen.
    }

    await interaction.editReply({
      content: `✅ Team-Liste wurde erstellt: ${panelMessage.url}`,
      components: [],
    });
  },
};