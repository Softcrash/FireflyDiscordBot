const { Client, ButtonInteraction, MessageFlags } = require('discord.js');
const { buildInfractionsContainer } = require('../utils/moderation/infractionsView');

module.exports = {
  // Dynamischer Button → wird im btnValidator per Prefix gematcht.
  // customId-Format: inf:page:<targetUserId>:<zielSeite>
  customIdPrefix: 'inf:page:',
  userPermissions: [],
  botPermissions: [],
  /**
   * @param {Client} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    const [, , targetUserId, rawPage] = interaction.customId.split(':');
    const targetPage = Number(rawPage) || 0;

    await interaction.deferUpdate();

    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    if (!targetUser) return;

    const { container } = await buildInfractionsContainer(
      interaction.guild.id,
      targetUser,
      targetPage
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};