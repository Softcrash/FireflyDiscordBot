const { BOOST_MESSAGE_ID, REACTION_ROLES } = require('../../utils/reaktionRoles/boosterRolesConfig');

module.exports = async (client, reaction, user) => {
  if (user.bot) return;
  if (!BOOST_MESSAGE_ID) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
  } catch (err) {
    console.error('[boostReactionAdd] Fetch-Fehler:', err);
    return;
  }

  if (reaction.message.id !== BOOST_MESSAGE_ID) return;

  const mapping = REACTION_ROLES.find(r =>
    reaction.emoji.id
      ? r.emojiId === reaction.emoji.id
      : r.emoji === reaction.emoji.name,
  );
  if (!mapping) return;

  const guild = reaction.message.guild;
  if (!guild) return;

  try {
    const member = await guild.members.fetch(user.id);
    if (!member.roles.cache.has(mapping.roleId)) {
      await member.roles.add(mapping.roleId, 'Boost-Panel Reaktion hinzugefügt');
    }
  } catch (err) {
    console.error('[boostReactionAdd] Rolle konnte nicht zugewiesen werden:', err);
  }
};