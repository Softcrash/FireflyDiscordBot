const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { buildLoggingPanel } = require('../../utils/moderation/logging/loggingPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logging-setup')
    .setDescription('Richtet das Logging-System ein (Voice, Nachrichten, Server, User).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.ManageWebhooks],
  devOnly: false,

  run: async (client, interaction) => {
    const panel = await buildLoggingPanel(interaction.guild);
    await interaction.reply({
      ...panel,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    });
  },
};