const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const { ModerationSetup, ModerationPermission } = require('../../database/registry');
const mConfig = require('../../messageConfig.json');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

const COMMAND_CHOICES = [
  { name: 'Ban', value: 'ban' },
  { name: 'Warn', value: 'warn' },
  { name: 'Timeout', value: 'timeout' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation-setup')
    .setDescription('Konfiguriert das Moderations-System für diesen Server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Setzt den Modlog-Channel.')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel in den Modlog-Embeds gepostet werden.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Zeigt die aktuelle Moderations-Konfiguration.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Aktiviert oder deaktiviert das Logging des Moderations-Systems.')
    )
    .addSubcommandGroup((group) =>
      group
        .setName('permission')
        .setDescription('Konfiguriert welche Rollen welche Mod-Commands nutzen dürfen.')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Erlaubt einer Rolle einen Mod-Command zu nutzen.')
            .addStringOption((opt) =>
              opt
                .setName('command')
                .setDescription('Welcher Mod-Command?')
                .setRequired(true)
                .addChoices(...COMMAND_CHOICES)
            )
            .addRoleOption((opt) =>
              opt.setName('role').setDescription('Die Rolle.').setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Entzieht einer Rolle das Recht für einen Mod-Command.')
            .addStringOption((opt) =>
              opt
                .setName('command')
                .setDescription('Welcher Mod-Command?')
                .setRequired(true)
                .addChoices(...COMMAND_CHOICES)
            )
            .addRoleOption((opt) =>
              opt.setName('role').setDescription('Die Rolle.').setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('list')
            .setDescription('Listet konfigurierte Mod-Rollen auf.')
            .addStringOption((opt) =>
              opt
                .setName('command')
                .setDescription('Optional: nur für einen bestimmten Command.')
                .addChoices(...COMMAND_CHOICES)
            )
        )
    ),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  testMode: true,
  devOnly: true,

  run: async (client, interaction) => {
    await interaction.deferReply(EPHEMERAL);

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const [setup] = await ModerationSetup.findOrCreate({
      where: { guildId },
      defaults: { guildId },
    });

    // ---------- Permission-Gruppe ----------
    if (group === 'permission') {
      const command = interaction.options.getString('command');
      const role = interaction.options.getRole('role');

      if (sub === 'add') {
        const [, created] = await ModerationPermission.findOrCreate({
          where: { guildId, command, roleId: role.id },
          defaults: { guildId, command, roleId: role.id },
        });

        const desc = created
          ? `\`✅\` ${role} darf jetzt \`/${command}\` nutzen.`
          : `\`ℹ️\` ${role} hatte bereits das Recht für \`/${command}\`.`;

        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(`#${mConfig.embedColorSuccess}`).setDescription(desc)],
        });
      }

      if (sub === 'remove') {
        const deleted = await ModerationPermission.destroy({
          where: { guildId, command, roleId: role.id },
        });

        const desc = deleted
          ? `\`✅\` ${role} darf \`/${command}\` nicht mehr nutzen.`
          : `\`ℹ️\` ${role} hatte das Recht für \`/${command}\` gar nicht.`;

        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(`#${mConfig.embedColorSuccess}`).setDescription(desc)],
        });
      }

      if (sub === 'list') {
        const filter = { guildId };
        if (command) filter.command = command;

        const perms = await ModerationPermission.findAll({ where: filter });

        if (perms.length === 0) {
          return interaction.editReply({
            content: command
              ? `\`ℹ️\` Für \`/${command}\` sind keine eigenen Rollen konfiguriert — es gelten die Discord-Default-Permissions.`
              : '`ℹ️` Es sind keine eigenen Mod-Rollen konfiguriert — es gelten die Discord-Default-Permissions.',
          });
        }

        // Nach Command gruppieren
        const grouped = {};
        for (const p of perms) {
          if (!grouped[p.command]) grouped[p.command] = [];
          grouped[p.command].push(`<@&${p.roleId}>`);
        }

        const fields = Object.entries(grouped).map(([cmd, roles]) => ({
          name: `/${cmd}`,
          value: roles.join(', '),
          inline: false,
        }));

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🛡️ Konfigurierte Mod-Rollen')
          .addFields(fields)
          .setFooter({ text: interaction.guild.name })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    }

    // ---------- Top-Level Subcommands ----------
    switch (sub) {
      case 'channel': {
        const channel = interaction.options.getChannel('channel');
        setup.modLogChannelId = channel.id;
        await setup.save();

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(`#${mConfig.embedColorSuccess}`)
              .setDescription(`\`✅\` Modlog-Channel wurde auf ${channel} gesetzt.`),
          ],
        });
      }

      case 'toggle': {
        setup.enabled = !setup.enabled;
        await setup.save();

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(setup.enabled ? `#${mConfig.embedColorSuccess}` : `#${mConfig.embedColorWarning}`)
              .setDescription(
                setup.enabled
                  ? '`✅` Moderations-Logging wurde **aktiviert**.'
                  : '`⏸️` Moderations-Logging wurde **deaktiviert**.'
              ),
          ],
        });
      }

      case 'status': {
        const channelMention = setup.modLogChannelId ? `<#${setup.modLogChannelId}>` : '_nicht gesetzt_';
        const permCount = await ModerationPermission.count({ where: { guildId } });

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🛡️ Moderation Status')
          .addFields(
            { name: '📺 Modlog-Channel', value: channelMention, inline: true },
            { name: '⚡ Logging', value: setup.enabled ? '`Aktiv`' : '`Deaktiviert`', inline: true },
            { name: '👥 Permission-Einträge', value: `\`${permCount}\``, inline: true }
          )
          .setFooter({ text: interaction.guild.name })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      default: {
        return interaction.editReply({ content: '`❌` Unbekannter Subcommand.' });
      }
    }
  },
};