const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channel')
    .setDescription('Sperrt oder entsperrt den aktuellen Channel für @everyone.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName('lock')
        .setDescription('Entzieht @everyone das Schreibrecht in diesem Channel.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('unlock')
        .setDescription('Gibt @everyone das Schreibrecht in diesem Channel zurück.'),
    ),

  execute: async (client, interaction) => {
    const channel = interaction.channel;

    if (channel.isThread()) {
      return interaction.reply({
        content: '❌ Threads können nicht gesperrt werden. Nutze den Command in einem Textkanal.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }

    const lock = interaction.options.getSubcommand() === 'lock';
    const everyone = interaction.guild.roles.everyone;

    try {
      await channel.permissionOverwrites.edit(everyone, {
        SendMessages: lock ? false : null,
      });

      await interaction.reply({
        content: lock
          ? `🔒 ${channel} wurde gesperrt – @everyone woran hats gelegen...`
          : `🔓 ${channel} wurde entsperrt – @everyone nun kanns wieder losgehen ihr lieben!`,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error(`Fehler beim ${lock ? 'Sperren' : 'Entsperren'} von Channel ${channel.id}:`, err);

      await interaction.reply({
        content: '❌ Konnte die Berechtigungen nicht ändern. Fehlt mir `Rollen verwalten` in diesem Channel?',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }
  },
};