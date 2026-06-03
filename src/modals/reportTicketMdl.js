const { Client, ModalSubmitInteraction } = require('discord.js');
const { createTicket } = require('../utils/tickets/ticketHandler');
 
module.exports = {
  customId: 'ticket_modal_report',
  userPermissions: [],
  botPermissions: [],
  /**
   * @param {Client} client
   * @param {ModalSubmitInteraction} interaction
   */
  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });
    await createTicket(interaction, 'report');
  },
};
