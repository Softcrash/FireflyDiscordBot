const { PermissionFlagsBits } = require('discord.js');
const { ModerationPermission } = require('../../database/registry');

// Discord-Default-Permission die wir nutzen, wenn für einen Command
// keine eigenen Rollen konfiguriert sind.
const FALLBACK_PERMISSIONS = {
  ban: PermissionFlagsBits.BanMembers,
  warn: PermissionFlagsBits.ModerateMembers,
  timeout: PermissionFlagsBits.ModerateMembers,
  infractions: PermissionFlagsBits.ModerateMembers,
};

/**
 * Prüft, ob `member` einen Mod-Command nutzen darf.
 * - Administrator darf immer
 * - Sonst: wenn Rollen konfiguriert sind, muss mind. eine davon vorhanden sein
 * - Wenn nichts konfiguriert ist, fällt's auf die Discord-Default-Permission
 *
 * @param {import('discord.js').GuildMember} member
 * @param {'ban'|'warn'|'timeout'|'infractions'} command
 * @returns {Promise<boolean>}
 */
async function canUseCommand(member, command) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const configuredRoles = await ModerationPermission.findAll({
    where: { guildId: member.guild.id, command },
  });

  if (configuredRoles.length === 0) {
    const fallback = FALLBACK_PERMISSIONS[command];
    return fallback ? member.permissions.has(fallback) : false;
  }

  return configuredRoles.some((perm) => member.roles.cache.has(perm.roleId));
}

/**
 * Hierarchie- und Sanity-Checks vor einer Mod-Aktion.
 * `target` kann ein User (bei Ban) oder ein GuildMember sein.
 *
 * @param {object} ctx
 * @param {import('discord.js').GuildMember} ctx.executor
 * @param {import('discord.js').User} ctx.targetUser
 * @param {import('discord.js').GuildMember|null} ctx.targetMember
 * @param {import('discord.js').GuildMember} ctx.bot
 * @param {import('discord.js').Guild} ctx.guild
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function canModerate({ executor, targetUser, targetMember, bot, guild }) {
  if (executor.id === targetUser.id) {
    return { ok: false, reason: 'Du kannst dich nicht selbst moderieren.' };
  }

  if (targetUser.bot) {
    return { ok: false, reason: 'Bots können nicht moderiert werden.' };
  }

  if (targetUser.id === guild.ownerId) {
    return { ok: false, reason: 'Der Server-Owner kann nicht moderiert werden.' };
  }

  // Wenn das Target Mitglied ist, Rollenhierarchie prüfen
  if (targetMember) {
    const isExecutorOwner = executor.id === guild.ownerId;
    if (!isExecutorOwner && executor.roles.highest.position <= targetMember.roles.highest.position) {
      return {
        ok: false,
        reason: 'Du kannst keinen User mit gleicher oder höherer Rolle moderieren.',
      };
    }

    if (bot.roles.highest.position <= targetMember.roles.highest.position) {
      return {
        ok: false,
        reason: 'Meine Rolle muss höher sein als die des Targets — sonst kann ich nicht einschreiten.',
      };
    }
  }

  return { ok: true };
}

module.exports = { canUseCommand, canModerate, FALLBACK_PERMISSIONS };