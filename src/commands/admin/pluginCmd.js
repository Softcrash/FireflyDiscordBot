// FILE: src/commands/admin/pluginCmd.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const { getAllPlugins, getPlugin } = require('../../utils/plugins/pluginRegistry');
const { getGuildStates, setEnabled, isEnabled } = require('../../utils/plugins/pluginState');
const {
  setNotifyChannel,
  clearNotifyChannel,
  getNotifyChannel,
} = require('../../utils/plugins/pluginNotify');

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
    )
    .addSubcommandGroup((group) =>
      group
        .setName('notify')
        .setDescription('Benachrichtigungen bei Plugin-Statusänderungen.')
        .addSubcommand((sub) =>
          sub
            .setName('set')
            .setDescription('Setzt den Channel für Plugin-Benachrichtigungen.')
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Der Zielchannel.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('off')
            .setDescription('Deaktiviert Plugin-Benachrichtigungen.')
        )
    ),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  devOnly: false,
  // Bewusst KEIN category-Feld: /plugin darf sich nie selbst aussperren.

  run: async (client, interaction) => {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ── /plugin notify set | off ─────────────────────────────────────────────
    if (group === 'notify') {
      if (sub === 'set') {
        const channel = interaction.options.getChannel('channel');

        // Vorab prüfen, ob der Bot dort überhaupt senden kann — sonst wird
        // die Konfiguration still nutzlos (Fehler landen nur im Log).
        const me = interaction.guild.members.me;
        const perms = channel.permissionsFor(me);
        if (
          !perms?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
          ])
        ) {
          return interaction.reply({
            content: `\`❌\` Mir fehlen in ${channel} Rechte (Ansehen, Senden oder Embeds).`,
            ...EPHEMERAL,
            allowedMentions: { parse: [] },
          });
        }

        try {
          await setNotifyChannel(guildId, channel.id);
        } catch (err) {
          console.error('[plugin] notify set fehlgeschlagen:', err);
          return interaction.reply({
            content: '`❌` Die Einstellung konnte nicht gespeichert werden.',
            ...EPHEMERAL,
          });
        }

        return interaction.reply({
          content: `\`✅\` Plugin-Benachrichtigungen gehen jetzt nach ${channel}.`,
          ...EPHEMERAL,
          allowedMentions: { parse: [] },
        });
      }

      if (sub === 'off') {
        let removed;
        try {
          removed = await clearNotifyChannel(guildId);
        } catch (err) {
          console.error('[plugin] notify off fehlgeschlagen:', err);
          return interaction.reply({
            content: '`❌` Die Einstellung konnte nicht gespeichert werden.',
            ...EPHEMERAL,
          });
        }

        return interaction.reply({
          content: removed
            ? '`✅` Plugin-Benachrichtigungen wurden deaktiviert.'
            : '`ℹ️` Es war kein Benachrichtigungs-Channel konfiguriert.',
          ...EPHEMERAL,
        });
      }
    }

    // ── /plugin list ─────────────────────────────────────────────────────────
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

      let notifyValue = '`nicht konfiguriert`';
      try {
        const notifyChannelId = await getNotifyChannel(guildId);
        if (notifyChannelId) notifyValue = `<#${notifyChannelId}>`;
      } catch (err) {
        console.error('[plugin] notify-Status laden fehlgeschlagen:', err);
      }

      const embed = new EmbedBuilder()
        .setColor(PANEL_COLOR)
        .setTitle('🔌 Plugins')
        .setDescription(lines.join('\n\n'))
        .addFields({ name: '📣 Benachrichtigungen', value: notifyValue })
        .setFooter({ text: interaction.guild.name })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ...EPHEMERAL,
        allowedMentions: { parse: [] },
      });
    }

    // ── /plugin enable | disable ─────────────────────────────────────────────
    const pluginId = interaction.options.getString('plugin');
    const plugin = getPlugin(pluginId);
    if (!plugin) {
      // Nur möglich, wenn registrierte Choices und Registry auseinanderlaufen
      // (z.B. alte globale Commands nach einer Registry-Änderung)
      return interaction.reply({
        content: '`❌` Unbekanntes Plugin — die Command-Registrierung ist veraltet.',
        ...EPHEMERAL,
      });
    }

    const enable = sub === 'enable';

    // No-op abfangen: keine redundante DB-Write + keine doppelte Benachrichtigung
    if (isEnabled(guildId, pluginId) === enable) {
      return interaction.reply({
        content: `\`ℹ️\` **${plugin.name}** ist bereits ${enable ? 'aktiviert' : 'deaktiviert'}.`,
        ...EPHEMERAL,
      });
    }

    try {
      // enable setzt autoDisabled/disabledReason implizit zurück (opts-Defaults);
      // guild + actor lösen die Benachrichtigung in den Notify-Channel aus
      await setEnabled(guildId, pluginId, enable, {
        guild: interaction.guild,
        actor: interaction.user,
      });
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