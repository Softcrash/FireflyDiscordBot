const { ingestAuditEntry } = require('../../utils/moderation/logging/auditResolver');

module.exports = async (client, entry, guild) => {
  if (!entry || !guild) return;
  ingestAuditEntry(guild, entry);
};