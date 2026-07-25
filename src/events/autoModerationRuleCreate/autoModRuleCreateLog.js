const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

const TRIGGER_DE = { 1: 'Schlüsselwörter', 3: 'Spam', 4: 'Wortlisten-Voreinstellung', 5: 'Mention-Spam', 6: 'Mitgliedsprofil' };

module.exports = async (client, rule) => {
  const guild = rule.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'autoMod', {})) return;

  const creator = rule.creatorId ? await client.users.fetch(rule.creatorId).catch(() => null) : null;
  if (skipBotExecutor(guild.id, creator)) return;

  const embed = buildLogEmbed({
    action: 'create',
    emoji: '🛡️',
    title: 'AutoMod-Regel erstellt',
    target: { name: rule.name, id: rule.id },
    fields: [
      { name: 'Auslöser', value: `\`${TRIGGER_DE[rule.triggerType] ?? rule.triggerType}\``, inline: true },
      {
        name: 'Erstellt von',
        value: rule.creatorId ? `<@${rule.creatorId}> (\`${rule.creatorId}\`)` : '`unbekannt`',
        inline: true,
      },
    ],
    footerId: rule.id,
  });
  await logEvent(guild, 'server', embed);
};