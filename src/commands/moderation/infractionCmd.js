const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { canUseCommand } = require('../../utils/moderation/modPermissions');
const { buildInfractionsContainer } = require('../../utils/moderation/infractionsView');

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
    // Wichtig: NICHT deferReply nutzen. Das IsComponentsV2-Flag muss beim ersten
    // Senden gesetzt werden und kann nachträglich nicht hinzugefügt werden — also
    // direkt mit reply() antworten. Die DB-Queries sind klein und schnell genug.

    if (!(await canUseCommand(interaction.member, 'infractions'))) {
      return interaction.reply({
        content: '`❌` Du hast keine Berechtigung, das Strafregister einzusehen.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetUser = interaction.options.getUser('user');

    let container;
    try {
      ({ container } = await buildInfractionsContainer(interaction.guild.id, targetUser, 0));
    } catch (err) {
      console.error('[infractions] Strafregister konnte nicht geladen werden:', err);
      return interaction.reply({
        content: '`❌` Das Strafregister konnte nicht geladen werden.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      allowedMentions: { parse: [] },
    });
  },
};