const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');
const { Infraction } = require('../../database/registry');
const { canUseCommand, canModerate } = require('../../utils/moderation/modPermissions');
const mConfig = require('../../messageConfig.json');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Verwarnt einen User und speichert es im Strafregister.')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Der zu verwarnende User.').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('grund')
        .setDescription('Warum wird der User verwarnt?')
        .setRequired(true)
        .setMaxLength(500)
    ),
  userPermissions: [],
  botPermissions: [],
  testMode: false,
  devOnly: false,

  run: async (client, interaction) => {
    await interaction.deferReply(EPHEMERAL);

    if (!(await canUseCommand(interaction.member, 'warn'))) {
      return interaction.editReply({
        content: '`❌` Du hast keine Berechtigung, den Warn-Command zu nutzen.',
      });
    }

    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const reason = interaction.options.getString('grund');

    if (!targetMember) {
      return interaction.editReply({
        content: '`❌` Der User ist nicht (mehr) auf diesem Server.',
      });
    }

    const check = canModerate({
      executor: interaction.member,
      targetUser,
      targetMember,
      bot: interaction.guild.members.me,
      guild: interaction.guild,
    });
    if (!check.ok) {
      return interaction.editReply({ content: `\`❌\` ${check.reason}` });
    }

    // Infraction speichern
    let infraction;
    try {
      infraction = await Infraction.create({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        type: 'warn',
        reason,
      });
    } catch (err) {
      console.error('[warn] Infraction konnte nicht gespeichert werden:', err);
      return interaction.editReply({
        content: '`❌` Die Verwarnung konnte nicht gespeichert werden.',
      });
    }

    // DM ans Target (best effort)
    const dmEmbed = new EmbedBuilder()
      .setColor(`#${mConfig.embedColorWarning}`)
      .setTitle(`⚠️ Du wurdest auf ${interaction.guild.name} verwarnt`)
      .addFields(
        { name: '📝 Grund', value: `\`\`\`${reason}\`\`\`` },
        { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true }
      )
      .setTimestamp();
    await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});

    // Bestätigung an Mod
    const confirmEmbed = new EmbedBuilder()
      .setColor(`#${mConfig.embedColorSuccess}`)
      .setDescription(
        `\`✅\` **${targetUser.tag}** wurde verwarnt.\n📝 Grund: \`${reason}\``
      );
    await interaction.editReply({ embeds: [confirmEmbed] });

    // Modlog-Event feuern
    client.emit('moderationAction', {
      guild: interaction.guild,
      moderator: interaction.member,
      targetUser,
      type: 'warn',
      reason,
      durationHuman: null,
      expiresAt: null,
      infraction,
    });
  },
};