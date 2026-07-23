const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('./logConstants');

const LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  total: 6000,
  fields: 25,
};

function clamp(value, max) {
  const str = String(value ?? '');
  return str.length <= max ? str : `${str.slice(0, Math.max(0, max - 1))}…`;
}

function formatTarget(target) {
  if (!target) return null;
  if (target.user && typeof target.user.username === 'string') {
    return `${target} · ${target.user.username} (\`${target.id}\`)`;
  }
  if (typeof target.username === 'string') {
    return `<@${target.id}> · ${target.username} (\`${target.id}\`)`;
  }
  if (typeof target.isTextBased === 'function') {
    return `<#${target.id}> · ${target.name ?? '—'} (\`${target.id}\`)`;
  }
  if (target.permissions !== undefined && target.guild) {
    return `<@&${target.id}> · ${target.name} (\`${target.id}\`)`;
  }
  if (target.id) return `${target.name ?? '—'} (\`${target.id}\`)`;
  return String(target.name ?? target);
}

/**
 * @param {{
 *   action?: 'create'|'delete'|'update'|'neutral',
 *   emoji?: string, title?: string,
 *   target?: object|null, executor?: object|null, reason?: string|null,
 *   fields?: Array<{ name: string, value: any, inline?: boolean }>,
 *   description?: string|null, footerId?: string|null,
 * }} opts
 */
function buildLogEmbed(opts = {}) {
  const {
    action = 'neutral',
    emoji = '',
    title = '',
    target = null,
    reason = null,
    fields = [],
    description = null,
    footerId = null,
  } = opts;

  const embed = new EmbedBuilder()
    .setColor(COLORS[action] ?? COLORS.neutral)
    .setTimestamp();

  const fullTitle = clamp(`${emoji ? `${emoji} ` : ''}${title}`.trim(), LIMITS.title);
  if (fullTitle) embed.setTitle(fullTitle);
  let total = fullTitle.length;

  if (description) {
    const desc = clamp(description, LIMITS.description);
    embed.setDescription(desc);
    total += desc.length;
  }

  if (footerId) {
    const footer = clamp(`ID: ${footerId}`, LIMITS.footer);
    embed.setFooter({ text: footer });
    total += footer.length;
  }

  const allFields = [];

  const targetValue = formatTarget(target);
  if (targetValue) allFields.push({ name: '🎯 Betroffen', value: targetValue });

  if ('executor' in opts) {
    allFields.push({
      name: '👮 Ausgeführt von',
      value: opts.executor ? `${opts.executor} (\`${opts.executor.id}\`)` : '`unbekannt`',
    });
  }

  if (reason) allFields.push({ name: '📝 Grund', value: reason });

  for (const field of fields) {
    if (!field) continue;
    const value = field.value === undefined || field.value === null ? '' : String(field.value);
    if (!value.length) continue; // Discord lehnt leere Feldwerte ab
    allFields.push({ name: field.name ?? '\u200b', value, inline: field.inline ?? false });
  }

  const finalFields = [];
  for (const field of allFields) {
    if (finalFields.length >= LIMITS.fields) break;
    const name = clamp(field.name, LIMITS.fieldName);
    const value = clamp(field.value, LIMITS.fieldValue);
    if (total + name.length + value.length > LIMITS.total - 60) {
      finalFields.push({ name: '\u200b', value: '`— weitere Angaben gekürzt —`' });
      break;
    }
    total += name.length + value.length;
    finalFields.push({ name, value, inline: field.inline });
  }

  if (finalFields.length) embed.addFields(finalFields);
  return embed;
}

module.exports = { buildLogEmbed, clamp, LIMITS };