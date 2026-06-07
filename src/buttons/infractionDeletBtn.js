const { Client, ButtonInteraction, MessageFlags } = require('discord.js');
const { Infraction } = require('../database/registry');
const { canUseCommand } = require('../utils/moderation/modPermissions');
const { buildInfractionsContainer } = require('../utils/moderation/infractionsView');

module.exports = {
  // Dynamischer Button → wird im btnValidator per Prefix gematcht.
  // customId-Format: inf:del:<infractionId>:<targetUserId>:<page>
  customIdPrefix: 'inf:del:',
  userPermissions: [],
  botPermissions: [],
  /**
   * @param {Client} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    const [, , rawInfId, targetUserId, rawPage] = interaction.customId.split(':');
    const infractionId = Number(rawInfId);
    const page = Number(rawPage) || 0;

    // Defensive Berechtigungsprüfung. Die Ansicht ist zwar ephemeral und an den
    // ausführenden User gebunden, aber Löschen ist destruktiv → trotzdem prüfen.
    if (!(await canUseCommand(interaction.member, 'infractions'))) {
      return interaction.reply({
        content: '`❌` Du hast keine Berechtigung, Einträge zu löschen.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    // Löschen — guildId + userId mit ins WHERE (Defense-in-Depth gegen
    // manipulierte customIds: man kann nur Einträge dieses Users in dieser Guild treffen).
    let deleted = 0;
    try {
      deleted = await Infraction.destroy({
        where: {
          id: infractionId,
          guildId: interaction.guild.id,
          userId: targetUserId,
        },
      });
    } catch (err) {
      console.error('[infractions] Löschen fehlgeschlagen:', err);
      return interaction.followUp({
        content: '`❌` Der Eintrag konnte nicht gelöscht werden.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    if (!targetUser) {
      return interaction.followUp({
        content: '`⚠️` Der Eintrag wurde gelöscht, aber das Panel konnte nicht aktualisiert werden.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Panel neu bauen — die Seite wird im Builder geclamped, falls sie jetzt leer ist.
    const { container } = await buildInfractionsContainer(
      interaction.guild.id,
      targetUser,
      page
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    if (deleted === 0) {
      await interaction.followUp({
        content: '`⚠️` Dieser Eintrag existierte nicht mehr (evtl. bereits gelöscht).',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};