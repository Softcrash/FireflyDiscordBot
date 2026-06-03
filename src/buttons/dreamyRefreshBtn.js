const { Client, ButtonInteraction, MessageFlags } = require('discord.js');
const { buildDreamyContainer } = require('../utils/dreamy/dreamyBuilder');

const REFRESH_COOLDOWN_MS = 60 * 60 * 1000; // 1 Stunde
const lastRefresh = new Map();

module.exports = {
  customId: 'dreamy_refresh',
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
      return interaction.reply({
        content: `⏳ Bitte warte noch \`${Math.ceil(remaining / 1000)}s\`, bevor du erneut aktualisierst.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    lastRefresh.set(guildId, Date.now());

    await interaction.deferUpdate();

    let container;
    try {
      container = await buildDreamyContainer(interaction.guild);
    } catch (err) {
      console.error('[dreamy] Refresh fehlgeschlagen:', err);
      return interaction.followUp({
        content: '❌ Das Dreamy-Panel konnte nicht aktualisiert werden.',
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