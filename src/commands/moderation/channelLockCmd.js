// FILE: src/commands/moderation/channelLockCmd.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channel')
    .setDescription('Sperrt oder entsperrt den aktuellen Channel für @everyone.')
    .setDMPermission(false)
    .addStringOption((opt) =>
      opt
        .setName('aktion')
        .setDescription('Soll der Channel gesperrt oder entsperrt werden?')
        .setRequired(true)
        .addChoices(
          { name: '🔒 Sperren', value: 'lock' },
          { name: '🔓 Entsperren', value: 'unlock' },
        ),
    ),

  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  testMode: true,
  devOnly: false,
  category: 'moderation',

  run: async (client, interaction) => {
    const channel = interaction.channel;

    if (channel.isThread()) {
      return interaction.reply({
        content: '❌ Threads können nicht gesperrt werden. Nutze den Command in einem Textkanal.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }

    const lock = interaction.options.getString('aktion') === 'lock';
    const everyone = interaction.guild.roles.everyone;

    try {
      // Beide Flags sperren, sonst kann über bestehende Threads weiter
      // geschrieben werden. Beim Entsperren auf null (neutral/vererbt)
      // zurücksetzen statt explizit auf true zu erzwingen.
      await channel.permissionOverwrites.edit(everyone, {
        SendMessages: lock ? false : null,
        SendMessagesInThreads: lock ? false : null,
      });

      await interaction.reply({
        content: lock
          ? `🔒 ${channel} wurde gesperrt – @everyone woran hats gelegen...`
          : `🔓 ${channel} wurde entsperrt – @everyone nun kanns wieder losgehen ihr lieben!`,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error(`Fehler beim ${lock ? 'Sperren' : 'Entsperren'} von Channel ${channel.id}:`, err);

      // Doppel-Reply vermeiden, falls der Fehler erst nach dem Reply auftrat
      if (interaction.replied || interaction.deferred) return;

      await interaction.reply({
        content: '❌ Konnte die Berechtigungen nicht ändern. Fehlt mir `Rollen verwalten` in diesem Channel?',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }
  },
};