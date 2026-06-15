const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');
const { CATEGORIES, CATEGORY_ORDER } = require('./logConstants');
const { getConfig } = require('./logManager');

const ID = {
  CATEGORY: 'logging:setup:category',
  CHANNEL: 'logging:setup:channel',
  CONFIRM: 'logging:setup:confirm',
};

const PANEL_COLOR = 0x5865f2;

// Transienter Draft pro Panel-Nachricht (eine Setup-Session).
// Bewusst In-Memory: das Setup-Panel ist ephemeral & kurzlebig — ein Neustart
// mitten im Setup ist vernachlässigbar (User öffnet das Panel einfach neu).
// key = messageId -> { category, channelId, ts }
const drafts = new Map();
const DRAFT_TTL = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, d] of drafts) if (now - d.ts > DRAFT_TTL) drafts.delete(id);
}, 5 * 60 * 1000).unref?.();

function getDraft(messageId) {
  return drafts.get(messageId) ?? { category: null, channelId: null, ts: Date.now() };
}

function setDraft(messageId, patch) {
  const next = { ...getDraft(messageId), ...patch, ts: Date.now() };
  drafts.set(messageId, next);
  return next;
}

function clearDraftChannel(messageId) {
  const cur = drafts.get(messageId);
  if (cur) drafts.set(messageId, { ...cur, channelId: null, ts: Date.now() });
}

/**
 * Baut Embed + Komponenten (2 Selects + Button) aus der gespeicherten
 * Konfiguration (DB) und dem aktuellen Draft.
 */
async function buildLoggingPanel(guild, draft = { category: null, channelId: null }, opts = {}) {
  const config = await getConfig(guild.id);

  const savedLines = CATEGORY_ORDER.map((key) => {
    const c = CATEGORIES[key];
    const row = config[key];
    const target = row?.channelId ? `<#${row.channelId}>` : '`nicht konfiguriert`';
    return `${c.emoji} **${c.label}** → ${target}`;
  });

  const selCat = draft.category ? CATEGORIES[draft.category] : null;
  const auswahl =
    `Kategorie: ${selCat ? `${selCat.emoji} **${selCat.label}**` : '`—`'}\n` +
    `Channel: ${draft.channelId ? `<#${draft.channelId}>` : '`—`'}`;

  const embed = new EmbedBuilder()
    .setColor(opts.color ?? PANEL_COLOR)
    .setTitle('🪵 Logging-Konfiguration')
    .setDescription(
      'Wähle eine **Kategorie** und den **Zielchannel**, und bestätige mit dem Button.\n' +
        'Logs werden per **Webhook** gesendet, um Rate-Limits bei vielen gleichzeitigen Aktionen zu vermeiden.'
    )
    .addFields(
      { name: '📋 Aktuelle Auswahl', value: auswahl },
      { name: '💾 Gespeicherte Logs', value: savedLines.join('\n') }
    )
    .setFooter({ text: guild.name })
    .setTimestamp();

  if (opts.note) embed.addFields({ name: '\u200b', value: opts.note });

  // 1) Kategorie-Select (Default = aktuell gewählte Kategorie)
  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId(ID.CATEGORY)
    .setPlaceholder('1️⃣ Logging-Kategorie wählen')
    .addOptions(
      CATEGORY_ORDER.map((key) => {
        const c = CATEGORIES[key];
        return new StringSelectMenuOptionBuilder()
          .setLabel(c.label)
          .setDescription(c.description)
          .setValue(c.key)
          .setEmoji(c.emoji)
          .setDefault(draft.category === c.key);
      })
    );

  // 2) Channel-Select (nur Text-/Ankündigungs-Channels — die unterstützen Webhooks)
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(ID.CHANNEL)
    .setPlaceholder('2️⃣ Zielchannel wählen')
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
  if (draft.channelId) channelSelect.setDefaultChannels(draft.channelId);

  // 3) Bestätigen (nur aktiv, wenn beides gewählt ist)
  const confirm = new ButtonBuilder()
    .setCustomId(ID.CONFIRM)
    .setLabel('Auswahl bestätigen')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success)
    .setDisabled(!(draft.category && draft.channelId));

  const components = [
    new ActionRowBuilder().addComponents(categorySelect),
    new ActionRowBuilder().addComponents(channelSelect),
    new ActionRowBuilder().addComponents(confirm),
  ];

  return { embeds: [embed], components };
}

module.exports = {
  ID,
  buildLoggingPanel,
  getDraft,
  setDraft,
  clearDraftChannel,
};