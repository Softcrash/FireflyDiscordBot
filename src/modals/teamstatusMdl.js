'use strict';

// FILE: src/modals/teamstatus.js
const { MessageFlags } = require('discord.js');
const panel = require('../utils/teamstatusPanel'); // Pfad ggf. anpassen

module.exports = {
  customId: panel.ID.MODAL, // "teamstatus:abmelden:modal"

  // Signatur an Modal-Validator angepasst: (client, interaction)
  run: async (client, interaction) => {
    // Modal wurde aus einem Button geöffnet → update() ist verfügbar
    if (!interaction.isFromMessage()) {
      return interaction.reply({
        content: '❌ Das Panel konnte nicht aktualisiert werden.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!(await panel.isTeamMember(interaction))) {
      return interaction.reply({
        content: '🚫 Nur Teammitglieder können sich abmelden.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const von = panel.parseGermanDate(interaction.fields.getTextInputValue(panel.ID.MODAL_VON));
    const bis = panel.parseGermanDate(interaction.fields.getTextInputValue(panel.ID.MODAL_BIS));

    if (!von.valid || !bis.valid) {
      return interaction.reply({
        content: '❌ Ungültiges Datum. Bitte im Format **TT.MM.JJJJ** angeben (z. B. 20.06.2026).',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (von.date && bis.date && von.date > bis.date) {
      return interaction.reply({
        content: '❌ Das „Von"-Datum liegt nach dem „Bis"-Datum.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const period = panel.buildPeriodLabel(von.date, bis.date);

    const state = panel.parsePanelState(interaction.message);
    state.set(interaction.user.id, { status: 'ABGEMELDET', period });

    return interaction.update(panel.panelPayload(state, { withFlags: false }));
  },
};