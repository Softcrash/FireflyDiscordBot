const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const {
  buildLoggingPanel,
  ID,
  getDraft,
  clearDraftChannel,
} = require('../utils/logging/loggingPanel');
const {
  setLogChannel,
  MissingWebhookPermission,
  WebhookTokenUnavailable,
} = require('../utils/logging/logManager');
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

    // Webhook-Erstellung + DB-Schreibvorgang können kurz dauern → erst deferren.
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
      let note;
      if (err instanceof MissingWebhookPermission) {
        note = `\`❌\` Mir fehlt in ${channel} die Berechtigung **Webhooks verwalten**.`;
      } else if (err instanceof WebhookTokenUnavailable) {
        note =
          '`❌` Discord hat kein Webhook-Token geliefert. Bitte erneut versuchen oder einen anderen Channel wählen.';
      } else {
        note = '`❌` Konnte den Webhook nicht erstellen. Bitte später erneut versuchen.';
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