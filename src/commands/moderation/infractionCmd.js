const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { canUseCommand } = require('../../utils/moderation/modPermissions');
const { buildInfractionsPage } = require('../../utils/moderation/infractionsView');
const Pagination = require('../../utils/pagination/pagination');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infractions')
    .setDescription('Zeigt das Strafregister eines Users.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Wessen Strafregister möchtest du sehen?').setRequired(true)
    ),
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    await interaction.deferReply(EPHEMERAL);

    if (!(await canUseCommand(interaction.member, 'infractions'))) {
      return interaction.editReply({
        content: '`❌` Du hast keine Berechtigung, das Strafregister einzusehen.',
      });
    }

    const targetUser = interaction.options.getUser('user');

    const pagination = new Pagination({
      interaction,
      fetchPage: (page) => buildInfractionsPage(interaction.guild.id, targetUser, page),
    });

    await pagination.send();
  },
};