const { Client, ButtonInteraction, MessageFlags } = require('discord.js');
const { TeamlistSetup } = require('../database/registry');
const { buildTeamlistContainer } = require('../utils/teamlist/teamlistBuilder');

const REFRESH_COOLDOWN_MS = 60 * 60 * 1000; // 1 Stunde
const lastRefresh = new Map();

module.exports = {
  customId: 'teamlist_refresh',
  userPermissions: [],
  botPermissions: [],
  /**
   * @param {Client} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    const guildId = interaction.guild.id;
    const last = lastRefresh.get(guildId) ?? 0;
    const remaining = REFRESH_COOLDOWN_MS - (Date.now() - last);

    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60_000);
      return interaction.reply({
        content: `⏳ Bitte warte noch \`${mins} Min\`, bevor du erneut aktualisierst.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    lastRefresh.set(guildId, Date.now());

    await interaction.deferUpdate();

    const setup = await TeamlistSetup.findOne({
      where: { guildId: interaction.guild.id },
    });

    if (!setup || !Array.isArray(setup.roleIds) || setup.roleIds.length === 0) {
      lastRefresh.delete(guildId);
      return interaction.followUp({
        content:
          '❌ Für diese Team-Liste ist keine Konfiguration (mehr) vorhanden. ' +
          'Richte sie mit `/teamlist-setup` neu ein.',
        flags: MessageFlags.Ephemeral,
      });
    }

    let container;
    try {
      container = await buildTeamlistContainer(interaction.guild, setup.roleIds);
    } catch (err) {
      console.error('[teamlist] Refresh fehlgeschlagen:', err);
      lastRefresh.delete(guildId);
      return interaction.followUp({
        content: '❌ Die Team-Liste konnte nicht aktualisiert werden.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};