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
    .setName('ban')
    .setDescription('Bannt einen User vom Server.')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Der zu bannende User.').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('grund')
        .setDescription('Warum wird der User gebannt?')
        .setRequired(true)
        .setMaxLength(500)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('delete_messages')
        .setDescription('Nachrichten der letzten X Tage löschen (0-7, default 0).')
        .setMinValue(0)
        .setMaxValue(7)
    ),
  userPermissions: [],
  botPermissions: [PermissionFlagsBits.BanMembers],
  testMode: true,
  devOnly: false,
  category: 'moderation',

  run: async (client, interaction) => {
    await interaction.deferReply(EPHEMERAL);

    if (!(await canUseCommand(interaction.member, 'ban'))) {
      return interaction.editReply({
        content: `\`❌\` Du hast keine Berechtigung, den Ban-Command zu nutzen.`,
      });
    }

    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user'); // kann null sein
    const reason = interaction.options.getString('grund');
    const deleteDays = interaction.options.getInteger('delete_messages') ?? 0;

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

    // DM ans Target (best effort, vor dem Ban — danach ist DM nicht mehr möglich)
    if (targetMember) {
      const dmEmbed = new EmbedBuilder()
        .setColor(`#${mConfig.embedColorError}`)
        .setTitle(`🔨 Du wurdest von ${interaction.guild.name} gebannt`)
        .addFields(
          { name: '📝 Grund', value: `\`\`\`${reason}\`\`\`` },
          { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true }
        )
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
    }

    // Ban ausführen
    try {
      await interaction.guild.members.ban(targetUser.id, {
        reason: `[${interaction.user.tag}] ${reason}`,
        deleteMessageSeconds: deleteDays * 86400,
      });
    } catch (err) {
      console.error('[ban] Ban fehlgeschlagen:', err);
      return interaction.editReply({
        content: '`❌` Der Ban konnte nicht ausgeführt werden.',
      });
    }

    // Infraction in DB speichern
    let infraction;
    try {
      infraction = await Infraction.create({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        type: 'ban',
        reason,
      });
    } catch (err) {
      console.error('[ban] Infraction konnte nicht gespeichert werden:', err);
    }

    // Bestätigung an Mod
    const confirmEmbed = new EmbedBuilder()
      .setColor(`#${mConfig.embedColorSuccess}`)
      .setDescription(
        `\`✅\` **${targetUser.tag}** wurde gebannt.\n📝 Grund: \`${reason}\``
      );
    await interaction.editReply({ embeds: [confirmEmbed] });

    // Modlog-Event feuern
    client.emit('moderationAction', {
      guild: interaction.guild,
      moderator: interaction.member,
      targetUser,
      type: 'ban',
      reason,
      durationHuman: null,
      expiresAt: null,
      infraction,
    });
  },
};