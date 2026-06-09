const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');
const { Infraction } = require('../../database/registry');
const { canUseCommand, canModerate } = require('../../utils/moderation/modPermissions');
const { parseDuration, MAX_TIMEOUT_SECONDS } = require('../../utils/moderation/duration');
const mConfig = require('../../messageConfig.json');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Setzt einen User in Timeout.')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Der User der getimeoutet werden soll.').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('dauer')
        .setDescription('Format: 30s / 5m / 2h / 7d (max. 28d).')
        .setRequired(true)
        .setMaxLength(10)
    )
    .addStringOption((opt) =>
      opt
        .setName('grund')
        .setDescription('Warum der Timeout?')
        .setRequired(true)
        .setMaxLength(500)
    ),
  userPermissions: [],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  testMode: false,
  devOnly: false,

  run: async (client, interaction) => {
    await interaction.deferReply(EPHEMERAL);

    if (!(await canUseCommand(interaction.member, 'timeout'))) {
      return interaction.editReply({
        content: '`❌` Du hast keine Berechtigung, den Timeout-Command zu nutzen.',
      });
    }

    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const durationStr = interaction.options.getString('dauer');
    const reason = interaction.options.getString('grund');

    if (!targetMember) {
      return interaction.editReply({
        content: '`❌` Der User ist nicht (mehr) auf diesem Server.',
      });
    }

    // Dauer parsen
    const duration = parseDuration(durationStr);
    if (!duration) {
      return interaction.editReply({
        content: '`❌` Ungültige Dauer. Beispiele: `30s`, `5m`, `2h`, `7d`.',
      });
    }
    if (duration.seconds > MAX_TIMEOUT_SECONDS) {
      return interaction.editReply({
        content: '`❌` Der maximale Timeout beträgt 28 Tage.',
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

    // Timeout ausführen
    try {
      await targetMember.timeout(duration.ms, `[${interaction.user.tag}] ${reason}`);
    } catch (err) {
      console.error('[timeout] Timeout fehlgeschlagen:', err);
      return interaction.editReply({
        content: '`❌` Der Timeout konnte nicht gesetzt werden.',
      });
    }

    const expiresAt = new Date(Date.now() + duration.ms);

    // Infraction speichern
    let infraction;
    try {
      infraction = await Infraction.create({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        type: 'timeout',
        reason,
        durationSeconds: duration.seconds,
        expiresAt,
      });
    } catch (err) {
      console.error('[timeout] Infraction konnte nicht gespeichert werden:', err);
    }

    // DM ans Target (best effort)
    const dmEmbed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle(`⏱️ Du wurdest auf ${interaction.guild.name} getimeoutet`)
      .addFields(
        { name: '⏱️ Dauer', value: duration.human, inline: true },
        { name: '📅 Endet', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
        { name: '📝 Grund', value: `\`\`\`${reason}\`\`\`` },
        { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true }
      )
      .setTimestamp();
    await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});

    // Bestätigung an Mod
    const confirmEmbed = new EmbedBuilder()
      .setColor(`#${mConfig.embedColorSuccess}`)
      .setDescription(
        `\`✅\` **${targetUser.tag}** wurde für **${duration.human}** getimeoutet.\n📝 Grund: \`${reason}\``
      );
    await interaction.editReply({ embeds: [confirmEmbed] });

    // Modlog-Event feuern
    client.emit('moderationAction', {
      guild: interaction.guild,
      moderator: interaction.member,
      targetUser,
      type: 'timeout',
      reason,
      durationHuman: duration.human,
      expiresAt,
      infraction,
    });
  },
};