const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const {
  buildLoggingPanel,
  ID,
  getDraft,
  clearDraftChannel,
} = require('../utils/moderation/logging/loggingPanel');
const { setLogChannel, MissingWebhookPermission } = require('../utils/moderation/logging/logManager');
const { CATEGORIES } = require('../utils/moderation/logging/logConstants');

module.exports = {
  customId: ID.CONFIRM,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],

  run: async (client, interaction) => {
    const draft = getDraft(interaction.message.id);

    if (!draft.category || !draft.channelId) {
      return interaction.reply({
        content: '`⚠️` Bitte zuerst eine Kategorie **und** einen Channel wählen.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    const channel =
      interaction.guild.channels.cache.get(draft.channelId) ??
      (await interaction.guild.channels.fetch(draft.channelId).catch(() => null));

    if (!channel) {
      const panel = await buildLoggingPanel(interaction.guild, draft, {
        note: '`❌` Der gewählte Channel existiert nicht mehr.',
        color: 0xfb2f61,
      });
      return interaction.editReply({ ...panel, allowedMentions: { parse: [] } });
    }

    const cat = CATEGORIES[draft.category];

    try {
      await setLogChannel(interaction.guild, draft.category, channel);
    } catch (err) {
      const note =
        err instanceof MissingWebhookPermission
          ? `\`❌\` Mir fehlt in ${channel} die Berechtigung **Webhooks verwalten**.`
          : '`❌` Konnte den Webhook nicht erstellen. Bitte später erneut versuchen.';
      if (!(err instanceof MissingWebhookPermission)) {
        console.error('[logging] setLogChannel:', err);
      }
      const panel = await buildLoggingPanel(interaction.guild, draft, { note, color: 0xfb2f61 });
      return interaction.editReply({ ...panel, allowedMentions: { parse: [] } });
    }

    // Erfolg → Channel-Auswahl zurücksetzen, Panel mit Erfolgsnotiz neu rendern.
    clearDraftChannel(interaction.message.id);
    const panel = await buildLoggingPanel(interaction.guild, getDraft(interaction.message.id), {
      color: 0x00d26a,
      note: `\`✅\` ${cat.emoji} **${cat.label}** werden jetzt in ${channel} geloggt.`,
    });
    await interaction.editReply({ ...panel, allowedMentions: { parse: [] } });
  },
};