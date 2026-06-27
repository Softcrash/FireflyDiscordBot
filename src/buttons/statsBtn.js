// FILE: src/buttons/statsBtn.js

const { buildMenuPayload } = require('../commands/general/statsCmd');

function parseFooter(message) {
  const text      = message?.embeds?.[0]?.footer?.text ?? '';
  const targetUser = text.match(/targetUser:(\S+)/)?.[1] ?? null;
  return { targetUser };
}

module.exports = {
  customId: 'stats:back',
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    await interaction.deferUpdate();
    const { targetUser } = parseFooter(interaction.message);
    // targetUser 'self' oder null → kein spezifischer User
    const targetUserId = targetUser && targetUser !== 'self' ? targetUser : null;
    await interaction.editReply(buildMenuPayload(targetUserId));
  },
};