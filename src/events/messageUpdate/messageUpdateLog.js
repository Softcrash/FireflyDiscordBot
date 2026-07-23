const { AttachmentBuilder } = require('discord.js');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, oldMessage, newMessage) => {
  if (newMessage.partial) {
    newMessage = await newMessage.fetch().catch(() => null);
    if (!newMessage) return;
  }

  const guild = newMessage.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (newMessage.webhookId) return;

  if (!newMessage.editedTimestamp) return;
  if (!oldMessage.partial && oldMessage.content === newMessage.content) return;

  const author = newMessage.author;
  if (
    !shouldLog(guild.id, 'message', 'messageUpdate', {
      channelId: newMessage.channelId,
      parentId: newMessage.channel?.parentId ?? null,
      user: author,
      member: newMessage.member ?? null,
      isBot: author?.bot ?? false,
    })
  ) {
    return;
  }

  const beforeRaw = oldMessage.partial ? null : oldMessage.content ?? '';
  const afterRaw = newMessage.content ?? '';

  const files = [];
  if ((beforeRaw?.length ?? 0) > 1024 || afterRaw.length > 1024) {
    const txt = [
      `Nachricht bearbeitet — ${newMessage.url}`,
      `Autor: ${author?.username ?? 'unbekannt'} (${author?.id ?? '?'})`,
      '',
      `${'='.repeat(5)} VORHER ${'='.repeat(47)}`,
      beforeRaw ?? '— nicht im Cache —',
      '',
      `${'='.repeat(5)} NACHHER ${'='.repeat(46)}`,
      afterRaw,
      '',
    ].join('\n');
    files.push(
      new AttachmentBuilder(Buffer.from(txt, 'utf8'), {
        name: `bearbeitung_${newMessage.id}.txt`,
      })
    );
  }

  const display = (raw, missing) => {
    if (raw === null) return missing;
    if (!raw.length) return '`— leer —`';
    return raw.length > 1024 ? `${raw.slice(0, 950)}…\n*(vollständig im Anhang)*` : raw;
  };

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '✏️',
    title: 'Nachricht bearbeitet',
    description:
      `**Autor:** ${author ? `${author} (\`${author.id}\`)` : '`unbekannt`'}\n` +
      `**Kanal:** <#${newMessage.channelId}> · [Zur Nachricht](${newMessage.url})`,
    fields: [
      { name: 'Vorher', value: display(beforeRaw, '`— nicht im Cache —`') },
      { name: 'Nachher', value: display(afterRaw, '`— leer —`') },
    ],
    footerId: newMessage.id,
  });

  await logEvent(guild, 'message', embed, { files });
};