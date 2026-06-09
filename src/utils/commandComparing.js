/**
 * @param {import('discord.js').ApplicationCommand} existing
 * @param {{ data: import('discord.js').SlashCommandBuilder }} local
 * @returns {boolean} true wenn unterschiedlich
 */
module.exports = (existing, local) => {
  const localPayload = local.data.toJSON();

  return !existing.equals(localPayload);
};