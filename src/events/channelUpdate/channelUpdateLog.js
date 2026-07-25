const { AuditLogEvent, OverwriteType } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { diffSimple, toFields, diffOverwrites } = require('../../utils/moderation/logging/logDiff');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

const FIELD_MAP = {
  name: 'Name',
  topic: 'Thema',
  parentId: { label: 'Kategorie', format: (v) => (v ? `<#${v}>` : '`—`') },
  nsfw: { label: 'NSFW', format: (v) => (v ? '`Ja`' : '`Nein`') },
  rateLimitPerUser: { label: 'Slowmode', format: (v) => (v ? `\`${v} s\`` : '`aus`') },
  bitrate: { label: 'Bitrate', format: (v) => (v ? `\`${Math.round(v / 1000)} kbps\`` : '`—`') },
  userLimit: { label: 'User-Limit', format: (v) => (v ? `\`${v}\`` : '`unbegrenzt`') },
};

module.exports = async (client, oldChannel, newChannel) => {
  const guild = newChannel.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'channelUpdate', { channelId: newChannel.id, parentId: newChannel.parentId })) return;

  const simple = diffSimple(oldChannel, newChannel, FIELD_MAP);
  const overwrites = diffOverwrites(
    oldChannel.permissionOverwrites?.cache,
    newChannel.permissionOverwrites?.cache
  );
  if (!simple.length && !overwrites.length) return;

  const types = [];
  if (overwrites.length) {
    types.push(
      AuditLogEvent.ChannelOverwriteUpdate,
      AuditLogEvent.ChannelOverwriteCreate,
      AuditLogEvent.ChannelOverwriteDelete
    );
  }
  if (simple.length) types.push(AuditLogEvent.ChannelUpdate);

  const info = await executorInfo(guild, { types, targetId: newChannel.id, label: '👮 Geändert von' });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const fields = toFields(simple);
  for (const ow of overwrites.slice(0, 6)) {
    const who =
      ow.id === guild.id ? '@everyone' : ow.type === OverwriteType.Member ? `<@${ow.id}>` : `<@&${ow.id}>`;
    fields.push({
      name: '🔐 Rechte-Overwrite',
      value: `${who}\n${ow.changes.map((c) => `\`${c}\``).join('\n')}`,
    });
  }
  if (overwrites.length > 6) {
    fields.push({ name: '\u200b', value: `*… und ${overwrites.length - 6} weitere Overwrites*` });
  }
  fields.push(...info.fields);

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '📘',
    title: 'Channel geändert',
    target: newChannel,
    reason: info.reason,
    fields,
    footerId: newChannel.id,
  });
  await logEvent(guild, 'server', embed);
};