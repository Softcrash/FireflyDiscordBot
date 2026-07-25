const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { diffSimple, toFields } = require('../../utils/moderation/logging/logDiff');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

const STATUS_DE = { 1: 'Geplant', 2: 'Aktiv', 3: 'Abgeschlossen', 4: 'Abgesagt' };

const FIELD_MAP = {
  name: 'Name',
  scheduledStartTimestamp: {
    label: 'Start',
    format: (v) => (v ? `<t:${Math.floor(v / 1000)}:f>` : '`—`'),
  },
  status: { label: 'Status', format: (v) => `\`${STATUS_DE[v] ?? v}\`` },
};

module.exports = async (client, oldEvent, newEvent) => {
  if (!oldEvent) return;
  const guild = newEvent.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'scheduledEvent', {})) return;

  const fields = toFields(diffSimple(oldEvent, newEvent, FIELD_MAP));
  const oldLoc = oldEvent.entityMetadata?.location ?? null;
  const newLoc = newEvent.entityMetadata?.location ?? null;
  if (oldLoc !== newLoc) {
    fields.push({ name: 'Ort', value: `\`${oldLoc ?? '—'}\` → \`${newLoc ?? '—'}\`` });
  }
  if (!fields.length) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.GuildScheduledEventUpdate,
    targetId: newEvent.id,
    label: '👮 Geändert von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '📅',
    title: 'Geplantes Event geändert',
    target: { name: newEvent.name, id: newEvent.id },
    reason: info.reason,
    fields: [...fields, ...info.fields],
    footerId: newEvent.id,
  });
  await logEvent(guild, 'server', embed);
};