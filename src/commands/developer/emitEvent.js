const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

const EVENT_CHOICES = [
  { name: 'guildMemberAdd',    value: 'guildMemberAdd' },
  { name: 'guildMemberRemove', value: 'guildMemberRemove' },
  { name: 'guildMemberUpdate', value: 'guildMemberUpdate' },
  { name: 'moderationAction',  value: 'moderationAction' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emit-event')
    .setDescription('Emit an event to the client.')
    .addStringOption((option) =>
      option
        .setName('event')
        .setDescription('The event to emit.')
        .setRequired(true)
        .addChoices(...EVENT_CHOICES)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  devOnly: true,

  run: async (client, interaction) => {
    const { member, options, guild, user } = interaction;
    const event = options.getString('event');

    switch (event) {
      case 'guildMemberAdd':
        // simuliert einen Join — feuert deinen Welcome-Handler
        client.emit('guildMemberAdd', member);
        break;

      case 'guildMemberRemove':
        // simuliert einen Leave
        client.emit('guildMemberRemove', member);
        break;

      case 'guildMemberUpdate':
        // alt == neu, reicht für die meisten Handler-Tests
        client.emit('guildMemberUpdate', member, member);
        break;

      case 'moderationAction':
        // Test-Payload für den modLogger — Moderator + Target = Caller
        client.emit('moderationAction', {
          guild,
          moderator: member,
          targetUser: user,
          type: 'warn',
          reason: '[TEST] /emit-event',
          durationHuman: null,
          expiresAt: null,
          infraction: { id: 'TEST' },
        });
        break;

      default:
        return interaction.reply({ content: 'Invalid event.', ...EPHEMERAL });
    }

    await interaction.reply({ content: `Emitted event \`${event}\``, ...EPHEMERAL });
  },
};