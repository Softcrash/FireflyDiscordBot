const { buildLoggingPanel, ID, setDraft } = require('../utils/moderation/logging/loggingPanel');

module.exports = {
  customId: ID.CHANNEL,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    const draft = setDraft(interaction.message.id, { channelId: interaction.values[0] });
    const panel = await buildLoggingPanel(interaction.guild, draft);
    await interaction.update({ ...panel, allowedMentions: { parse: [] } });
  },
};