const { buildLoggingPanel, ID, setDraft } = require('../utils/moderation/logging/loggingPanel');

module.exports = {
  customId: ID.CATEGORY,
  userPermissions: [],
  botPermissions: [],
  category: 'logging',

  run: async (client, interaction) => {
    const draft = setDraft(interaction.message.id, { category: interaction.values[0] });
    const panel = await buildLoggingPanel(interaction.guild, draft);
    await interaction.update({ ...panel, allowedMentions: { parse: [] } });
  },
};