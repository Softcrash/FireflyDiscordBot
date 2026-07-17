const {
  Client,
  ButtonInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  FileBuilder,
  MessageFlags,
} = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');

// Alle Rollen die Tickets schließen dürfen
const TEAM_ROLE_IDS = [
  '1491474814546874609', // Team
  '1501651717324935408', // weitere Rollen hier ergänzen
];

// Channel in den die Transkripte gesendet werden
const TRANSCRIPT_CHANNEL_ID = '1491555171191357540';

module.exports = {
  customId: 'ticketClose',
  userPermissions: [],
  botPermissions: [],
  category: 'tickets',
  /**
   * @param {Client} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    const { member, channel, guild } = interaction;

    if (!channel.isThread()) {
      return interaction.reply({
        content: '❌ Dieser Button funktioniert nur in einem Thread.',
        ephemeral: true,
      });
    }

    // Prüfe ob User mindestens eine der erlaubten Team-Rollen hat
    const hasTeamRole = TEAM_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
    if (!hasTeamRole) {
      return interaction.reply({
        content: '❌ Du hast keine Berechtigung, dieses Ticket zu schließen.',
        ephemeral: true,
      });
    }

    await interaction.reply({ content: '📝 Transkript wird erstellt...' });

    // --- 1. Filename festlegen, damit wir ihn im File-Component referenzieren können ---
    const safeName = channel.name.replace(/[^\w-]/g, '').slice(0, 50) || 'ticket';
    const transcriptFilename = `transcript-${safeName}-${Date.now()}.html`;

    // --- 2. Transkript generieren ---
    let transcript;
    try {
      transcript = await discordTranscripts.createTranscript(channel, {
        limit: -1,
        returnType: 'attachment',
        filename: transcriptFilename,
        saveImages: true,
        poweredBy: false,
        footerText: 'Exportiert {number} Nachricht{s}',
      });
    } catch (err) {
      console.error('[Ticket] Transkript erstellen fehlgeschlagen:', err);
      await interaction.editReply({
        content: '⚠️ Transkript konnte nicht erstellt werden — Ticket wird trotzdem geschlossen.',
      });
    }

    // --- 3. Ticket-Ersteller herausfinden ---
    let ticketCreator = null;
    try {
      const firstMessage = (await channel.messages.fetch({ limit: 1, after: '0' })).first();
      ticketCreator = firstMessage?.mentions?.users?.first() ?? null;
    } catch (err) {
      console.error('[Ticket] Ticket-Ersteller nicht ermittelbar:', err);
    }

    // --- 4. Transkript-Container bauen und in Log-Channel posten ---
    if (transcript) {
      try {
        const transcriptChannel = await guild.channels.fetch(TRANSCRIPT_CHANNEL_ID);
        if (transcriptChannel) {
          const header = new TextDisplayBuilder()
            .setContent('# 📋 Ticket Transkript');

          const info = new TextDisplayBuilder()
            .setContent(
              [
                `**🎫 Ticket:** \`${channel.name}\``,
                `**👤 Erstellt von:** ${ticketCreator ? `${ticketCreator} (\`${ticketCreator.tag}\`)` : '_Unbekannt_'}`,
                `**🔒 Geschlossen von:** ${member} (\`${member.user.tag}\`)`,
                `**🕐 Erstellt:** <t:${Math.floor(channel.createdTimestamp / 1000)}:F>`,
                `**🕐 Geschlossen:** <t:${Math.floor(Date.now() / 1000)}:R>`,
              ].join('\n')
            );

          const separator1 = new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small);

          const separator2 = new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small);

          const fileComponent = new FileBuilder()
            .setURL(`attachment://${transcriptFilename}`);

          const container = new ContainerBuilder()
            .setAccentColor(0x5865f2)
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(info)
            .addSeparatorComponents(separator2)
            .addFileComponents(fileComponent);

          await transcriptChannel.send({
            components: [container],
            files: [transcript],
            flags: MessageFlags.IsComponentsV2,
          });
        } else {
          console.error(`[Ticket] Transkript-Channel ${TRANSCRIPT_CHANNEL_ID} nicht gefunden`);
        }
      } catch (err) {
        console.error('[Ticket] Transkript senden fehlgeschlagen:', err);
      }
    }

    // --- 5. User im Thread informieren ---
    await interaction.editReply({
      content: '🔒 Ticket wird geschlossen... Transkript wurde im Log-Channel gespeichert.',
    });

    // --- 6. Kurz warten, dann Thread löschen ---
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await channel.delete(`Ticket geschlossen von ${member.user.tag}`).catch((err) => {
      console.error('[Ticket] Thread löschen fehlgeschlagen:', err);
    });
  },
};