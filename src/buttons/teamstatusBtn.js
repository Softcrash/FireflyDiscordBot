const { MessageFlags } = require('discord.js');
const panel = require('../utils/teamstatusPanel');

module.exports = {
  // btnValidator: startsWith("teamstatus") → matcht alle teamstatus:* Buttons
  customIdPrefix: panel.ID.PREFIX,

  run: async (interaction, client) => {
    const action = interaction.customId.split(':')[1];

    if (action === 'refresh') return handleRefresh(interaction);

    if (action === 'abmelden') {
      if (!(await panel.isTeamMember(interaction))) {
        return interaction.reply({
          content: '🚫 Nur Teammitglieder können sich abmelden.',
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.showModal(panel.buildAbmeldenModal());
    }

    if (action === 'aktiv')   return handleStatusChange(interaction, 'AKTIV');
    if (action === 'inaktiv') return handleStatusChange(interaction, 'INAKTIV');
  },
};

// 🔄 Refresh: aktuelle Teamler holen, bestehende Status erhalten, neu aufbauen
async function handleRefresh(interaction) {
  const guildId = interaction.guild.id;

  const rest = panel.getRefreshCooldown(guildId);
  if (rest > 0) {
    return interaction.reply({
      content: `⏳ Bitte warte noch ${rest}s, bevor du erneut aktualisierst.`,
      flags: MessageFlags.Ephemeral,
    });
  }
  panel.setRefreshCooldown(guildId);

  let collected;
  try {
    collected = await panel.collectTeamMembers(interaction.guild);
  } catch (err) {
    console.error('[teamstatus] Mitglieder-Fetch fehlgeschlagen:', err);
    return interaction.reply({
      content: '⚠️ Konnte die Mitglieder gerade nicht laden (evtl. Rate-Limit). Bitte gleich erneut versuchen.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const { roleIds, members } = collected;
  if (!roleIds.length) {
    return interaction.reply({
      content: '⚠️ Es sind keine Teamrollen hinterlegt.',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Bestehenden Stand aus der Nachricht übernehmen, neue Teamler ergänzen,
  // ausgetretene fallen weg.
  const old = panel.parsePanelState(interaction.message);
  const next = new Map();
  for (const id of members) {
    next.set(id, old.get(id) ?? { status: panel.DEFAULT_STATUS, period: null });
  }

  return interaction.update(panel.panelPayload(next));
}

async function handleStatusChange(interaction, status) {
  if (!(await panel.isTeamMember(interaction))) {
    return interaction.reply({
      content: '🚫 Nur Teammitglieder können hier ihren Status setzen.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const state = panel.parsePanelState(interaction.message);
  state.set(interaction.user.id, { status, period: null });

  return interaction.update(panel.panelPayload(state));
}