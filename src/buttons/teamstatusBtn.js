'use strict';

// FILE: src/buttons/teamstatus.js
const { MessageFlags } = require('discord.js');
const panel = require('../utils/teamstatusPanel'); // Pfad ggf. anpassen

module.exports = {
  // btnValidator: startsWith("teamstatus") → matcht alle teamstatus:* Buttons
  customIdPrefix: panel.ID.PREFIX,

  // Signatur an btnValidator angepasst: (client, interaction)
  run: async (client, interaction) => {
    const action = interaction.customId.split(':')[1];

    if (action === 'refresh') return handleRefresh(interaction);

    if (action === 'abmelden') {
      if (!(await panel.isTeamMember(interaction))) {
        return interaction.reply({
          content: '🚫 Nur Teammitglieder können sich abmelden.',
          flags: MessageFlags.Ephemeral,
        });
      }
      // Kein defer vor showModal – Modal muss die erste Antwort sein
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

  // Stand VOR dem deferUpdate parsen, dann sofort deferren:
  // members.fetch() kann >3s dauern. Auf einer bestehenden CV2-Nachricht
  // ist deferUpdate unkritisch, da das Flag bereits auf ihr liegt.
  const old = panel.parsePanelState(interaction.message);
  await interaction.deferUpdate();

  let collected;
  try {
    collected = await panel.collectTeamMembers(interaction.guild);
  } catch (err) {
    console.error('[teamstatus] Mitglieder-Fetch fehlgeschlagen:', err);
    return interaction.followUp({
      content: '⚠️ Konnte die Mitglieder gerade nicht laden (evtl. Rate-Limit). Bitte gleich erneut versuchen.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const { members } = collected;

  // Bestehende Status übernehmen, neue Teamler ergänzen, ausgetretene fallen weg
  const next = new Map();
  for (const id of members) {
    next.set(id, old.get(id) ?? { status: panel.DEFAULT_STATUS, period: null });
  }

  return interaction.editReply(panel.panelPayload(next, { withFlags: false }));
}

// 🟢 / ⚫ Status direkt setzen (Self-Service, kein Modal)
async function handleStatusChange(interaction, status) {
  if (!(await panel.isTeamMember(interaction))) {
    return interaction.reply({
      content: '🚫 Nur Teammitglieder können hier ihren Status setzen.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const state = panel.parsePanelState(interaction.message);
  state.set(interaction.user.id, { status, period: null });

  return interaction.update(panel.panelPayload(state, { withFlags: false }));
}