const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { buildDreamyContainer } = require('../../utils/dreamy/dreamyBuilder');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dreamy-setup')
    .setDescription('Sendet das Dreamy-Garden-Panel in diesen Kanal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  devOnly: true,
  run: async (client, interaction) => {
    await interaction.deferReply(EPHEMERAL);

    let container;
    try {
      container = await buildDreamyContainer(interaction.guild);
    } catch (err) {
      console.error('[dreamy-setup] Panel bauen fehlgeschlagen:', err);
      return interaction.editReply({
        content: '❌ Das Panel konnte nicht erstellt werden.',
      });
    }

    try {
      await interaction.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error('[dreamy-setup] Konnte Panel nicht senden:', err);
      return interaction.editReply({
        content: '❌ Konnte das Panel nicht senden. Habe ich Schreibrechte in diesem Kanal?',
      });
    }

    await interaction.editReply({ content: '✅ Dreamy-Garden-Panel wurde gesendet.' });
  },
};