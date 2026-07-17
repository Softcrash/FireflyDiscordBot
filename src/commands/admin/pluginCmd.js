// FILE: src/commands/admin/pluginCmd.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');
const { getAllPlugins, getPlugin } = require('../../utils/plugins/pluginRegistry');
const { getGuildStates, setEnabled } = require('../../utils/plugins/pluginState');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };
const PANEL_COLOR = 0x5865f2;

// Choices einmal beim Require aus der Registry bauen (Discord-Limit: 25)
const PLUGIN_CHOICES = getAllPlugins().map((p) => ({ name: p.name, value: p.id }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugin')
    .setDescription('Verwaltet die Plugins (Feature-Module) dieses Servers.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Zeigt den Status aller Plugins.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Aktiviert ein Plugin auf diesem Server.')
        .addStringOption((opt) =>
          opt
            .setName('plugin')
            .setDescription('Das Plugin.')
            .setRequired(true)
            .addChoices(...PLUGIN_CHOICES)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Deaktiviert ein Plugin auf diesem Server.')
        .addStringOption((opt) =>
          opt
            .setName('plugin')
            .setDescription('Das Plugin.')
            .setRequired(true)
            .addChoices(...PLUGIN_CHOICES)
        )
    ),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  testMode: true,
  devOnly: false,

  run: async (client, interaction) => {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'list') {
      const lines = getGuildStates(guildId).map(
        ({ plugin, enabled, autoDisabled, disabledReason }) => {
          const status = enabled ? '`✅`' : '`❌`';
          let line = `${status} **${plugin.name}** — ${plugin.description}`;
          if (!enabled && autoDisabled) {
            line += `\n> ⚠️ Automatisch deaktiviert${disabledReason ? `: ${disabledReason}` : ''}`;
          }
          return line;
        }
      );

      const embed = new EmbedBuilder()
        .setColor(PANEL_COLOR)
        .setTitle('🔌 Plugins')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: interaction.guild.name })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ...EPHEMERAL,
        allowedMentions: { parse: [] },
      });
    }

    const pluginId = interaction.options.getString('plugin');
    const plugin = getPlugin(pluginId);
    if (!plugin) {
      return interaction.reply({
        content: '`❌` Unbekanntes Plugin — die Command-Registrierung ist veraltet.',
        ...EPHEMERAL,
      });
    }

    const enable = sub === 'enable';

    try {
      await setEnabled(guildId, pluginId, enable);
    } catch (err) {
      console.error(`[plugin] ${sub} ${pluginId} fehlgeschlagen:`, err);
      return interaction.reply({
        content: '`❌` Die Einstellung konnte nicht gespeichert werden.',
        ...EPHEMERAL,
      });
    }

    return interaction.reply({
      content: enable
        ? `\`✅\` **${plugin.name}** wurde aktiviert.`
        : `\`✅\` **${plugin.name}** wurde deaktiviert.`,
      ...EPHEMERAL,
    });
  },
};