const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const { CountingSetup, Counting } = require('../../database/registry');
const mConfig = require('../../messageConfig.json');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

/**
 * Stellt sicher, dass es für die Guild sowohl einen Setup- als auch einen State-Row gibt.
 * @returns {Promise<{setup: CountingSetup, state: Counting}>}
 */
async function ensureRows(guildId) {
  const [setup] = await CountingSetup.findOrCreate({
    where: { guildId },
    defaults: { guildId },
  });
  const [state] = await Counting.findOrCreate({
    where: { guildId },
    defaults: { guildId },
  });
  return { setup, state };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('counting-setup')
    .setDescription('Konfiguriert das Counting-System für diesen Server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Setzt den Counting-Channel.')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Der Channel in dem gezählt wird.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Zeigt die aktuelle Counting-Konfiguration.')
    )
    .addSubcommand((sub) =>
      sub.setName('reset').setDescription('Setzt den Zähler auf 0 zurück.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Aktiviert oder deaktiviert das Counting-System.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('set-count')
        .setDescription('Setzt den Zähler manuell auf einen bestimmten Wert.')
        .addIntegerOption((opt) =>
          opt
            .setName('number')
            .setDescription('Die neue Zahl (≥ 0). Die nächste erwartete Zahl ist diese + 1.')
            .setMinValue(0)
            .setRequired(true)
        )
    ),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.AddReactions, PermissionFlagsBits.SendMessages],
  testMode: false,
  devOnly: true,

  run: async (client, interaction) => {
    await interaction.deferReply(EPHEMERAL);

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const { setup, state } = await ensureRows(guildId);

    switch (sub) {
      case 'channel': {
        const channel = interaction.options.getChannel('channel');
        setup.channelId = channel.id;
        await setup.save();

        const embed = new EmbedBuilder()
          .setColor(`#${mConfig.embedColorSuccess}`)
          .setDescription(`\`✅\` Counting-Channel wurde auf ${channel} gesetzt.`);
        return interaction.editReply({ embeds: [embed] });
      }

      case 'status': {
        const channelMention = setup.channelId ? `<#${setup.channelId}>` : '_nicht gesetzt_';
        const lastUserMention = state.lastUserId ? `<@${state.lastUserId}>` : '_niemand_';

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🔢 Counting Status')
          .addFields(
            { name: '📺 Channel', value: channelMention, inline: true },
            { name: '⚡ Status', value: setup.enabled ? '`Aktiv`' : '`Deaktiviert`', inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '🔢 Aktueller Stand', value: `\`${state.currentCount}\``, inline: true },
            { name: '🎯 Nächste Zahl', value: `\`${state.currentCount + 1}\``, inline: true },
            { name: '🏆 Highscore', value: `\`${state.highScore}\``, inline: true },
            { name: '👤 Letzter Zähler', value: lastUserMention, inline: false }
          )
          .setFooter({ text: `Server: ${interaction.guild.name}` })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      case 'reset': {
        state.currentCount = 0;
        state.lastUserId = null;
        state.lastMessageId = null;
        await state.save();

        const embed = new EmbedBuilder()
          .setColor(`#${mConfig.embedColorSuccess}`)
          .setDescription('`✅` Der Zähler wurde auf `0` zurückgesetzt. Die nächste Zahl ist `1`.');
        return interaction.editReply({ embeds: [embed] });
      }

      case 'toggle': {
        setup.enabled = !setup.enabled;
        await setup.save();

        const embed = new EmbedBuilder()
          .setColor(setup.enabled ? `#${mConfig.embedColorSuccess}` : `#${mConfig.embedColorWarning}`)
          .setDescription(
            setup.enabled
              ? '`✅` Counting-System wurde **aktiviert**.'
              : '`⏸️` Counting-System wurde **deaktiviert**.'
          );
        return interaction.editReply({ embeds: [embed] });
      }

      case 'set-count': {
        const number = interaction.options.getInteger('number');
        state.currentCount = number;
        state.lastUserId = null;
        state.lastMessageId = null;
        if (number > state.highScore) state.highScore = number;
        await state.save();

        const embed = new EmbedBuilder()
          .setColor(`#${mConfig.embedColorSuccess}`)
          .setDescription(
            `\`✅\` Zähler wurde auf \`${number}\` gesetzt. Die nächste erwartete Zahl ist \`${number + 1}\`.`
          );
        return interaction.editReply({ embeds: [embed] });
      }

      default: {
        return interaction.editReply({ content: '`❌` Unbekannter Subcommand.' });
      }
    }
  },
};