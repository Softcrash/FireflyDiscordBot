const { Client, ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TEAM_ROLE_ID = '1239637949046587483'; // 👈 anpassen

module.exports = {
  customId: 'ticketClaim',
  userPermissions: [],
  botPermissions: [],
  category: 'ticket',
  /**
   * @param {Client} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    const { member, channel, guild } = interaction;

    // Nur Team-Rolle darf claimen
    if (!member.roles.cache.has(TEAM_ROLE_ID)) {
      return interaction.reply({ content: '❌ Du hast keine Berechtigung, dieses Ticket zu claimen.', ephemeral: true });
    }

    if (!channel.isThread()) {
      return interaction.reply({ content: '❌ Dieser Button funktioniert nur in einem Thread.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    // Alle Thread-Member holen
    const threadMembers = await channel.members.fetch();

    // Ticket-Ersteller aus Thread-Name oder Embed holen —
    // wir lesen die User-ID aus dem ersten Embed im ersten Thread-Message
    const starterMessage = await channel.fetchStarterMessage().catch(() => null);
    let ticketCreatorId = null;

    if (starterMessage?.embeds?.[0]) {
      // Format im Embed: "<@ID> | <@&ROLE_ID>" im content
      const match = starterMessage.content?.match(/<@(\d+)>/);
      if (match) ticketCreatorId = match[1];
    }

    // Alle Team-Mitglieder der Rolle außer dem Claimer rauswerfen
    const teamRole = await guild.roles.fetch(TEAM_ROLE_ID);
    const teamMemberIds = teamRole?.members.map((m) => m.id) ?? [];

    for (const [id] of threadMembers) {
      if (id === member.id) continue;           // Claimer bleibt
      if (id === ticketCreatorId) continue;      // Ticket-Ersteller bleibt
      if (id === client.user.id) continue;       // Bot bleibt
      if (teamMemberIds.includes(id)) {
        await channel.members.remove(id).catch(() => null);
      }
    }

    // Embed updaten — Claim-Status reinschreiben
    if (starterMessage) {
      const oldEmbed = starterMessage.embeds[0];
      const { EmbedBuilder } = require('discord.js');

      const updatedEmbed = EmbedBuilder.from(oldEmbed).addFields({
        name: '🙋 Geclaimed von',
        value: `${member} (\`${member.user.tag}\`)`,
        inline: true,
      });

      await starterMessage.edit({ embeds: [updatedEmbed] }).catch(() => null);
    }

    // Buttons updaten — Claim deaktivieren
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const oldComponents = starterMessage?.components ?? [];

    if (oldComponents.length > 0) {
      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticketClaim')
          .setLabel('Claimed ✓')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('ticketClose')
          .setLabel('🔒 Ticket schließen')
          .setStyle(ButtonStyle.Danger),
      );
      await starterMessage.edit({ components: [updatedRow] }).catch(() => null);
    }

    await interaction.editReply({ content: `✅ Du hast das Ticket geclaimed. Alle anderen Team-Mitglieder wurden entfernt.` });
  },
};