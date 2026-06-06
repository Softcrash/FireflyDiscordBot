const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');

const DEFAULTS = {
  timeout: 60_000,
  restrictToCaller: true,
  prevLabel: '◀ Zurück',
  nextLabel: 'Weiter ▶',
};

/**
 * Generische Pagination für Embed-basierte Listen.
 *
 * Nutzt einen MessageComponentCollector um Button-Klicks abzufangen.
 * Buttons werden nach Ablauf des Timeouts automatisch disabled.
 *
 * @example
 *   const pagination = new Pagination({
 *     interaction,
 *     fetchPage: async (page) => {
 *       const items = await DB.findAll({ limit: 5, offset: page * 5 });
 *       const total = await DB.count();
 *       return {
 *         embed: buildEmbed(items),
 *         totalPages: Math.max(1, Math.ceil(total / 5)),
 *       };
 *     },
 *   });
 *   await pagination.send();
 */
class Pagination {
  /**
   * @param {object} options
   * @param {import('discord.js').BaseInteraction} options.interaction
   *   Die Slash-Command-Interaction (deferred oder nicht — beides wird unterstützt).
   * @param {(pageIndex: number) => Promise<{ embed: import('discord.js').EmbedBuilder, totalPages: number }>} options.fetchPage
   *   Callback der für eine Seitennummer das Embed + totalPages liefert. 0-basiert.
   * @param {number} [options.timeout=60000]
   *   Zeit in ms bis die Buttons disabled werden (Inaktivität).
   * @param {boolean} [options.restrictToCaller=true]
   *   Wenn true, dürfen nur der ursprüngliche Caller die Buttons nutzen.
   * @param {boolean} [options.ephemeral=false]
   *   Nur relevant wenn die Interaction noch nicht deferred ist.
   * @param {string} [options.prevLabel]
   * @param {string} [options.nextLabel]
   */
  constructor(options) {
    if (!options?.interaction) {
      throw new Error('Pagination: `interaction` ist erforderlich.');
    }
    if (typeof options?.fetchPage !== 'function') {
      throw new Error('Pagination: `fetchPage` muss eine Funktion sein.');
    }

    this.interaction = options.interaction;
    this.fetchPage = options.fetchPage;
    this.timeout = options.timeout ?? DEFAULTS.timeout;
    this.restrictToCaller = options.restrictToCaller ?? DEFAULTS.restrictToCaller;
    this.ephemeral = options.ephemeral ?? false;
    this.prevLabel = options.prevLabel ?? DEFAULTS.prevLabel;
    this.nextLabel = options.nextLabel ?? DEFAULTS.nextLabel;

    // Unique customIds — verhindert Kollisionen falls zwei Paginations
    // gleichzeitig auf demselben Channel laufen.
    const tag = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.prevId = `pgn_prev_${tag}`;
    this.nextId = `pgn_next_${tag}`;

    this.currentPage = 0;
    this.totalPages = 1;
  }

  /**
   * Postet die erste Seite und startet den Collector (sofern mehr als 1 Seite).
   */
  async send() {
    const { embed, totalPages } = await this.fetchPage(0);
    this.totalPages = Math.max(1, totalPages);

    const components = [this._buildRow()];
    const message = await this._reply({ embeds: [embed], components });

    if (this.totalPages <= 1) return; // Single-Page → Buttons disabled, kein Collector

    this._startCollector(message);
  }

  // ---------- Internals ----------

  _buildRow(allDisabled = false) {
    const prevDisabled = allDisabled || this.currentPage === 0;
    const nextDisabled = allDisabled || this.currentPage >= this.totalPages - 1;

    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(this.prevId)
        .setLabel(this.prevLabel)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(prevDisabled),
      new ButtonBuilder()
        .setCustomId(this.nextId)
        .setLabel(this.nextLabel)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(nextDisabled),
    );
  }

  async _reply(payload) {
    if (this.interaction.deferred || this.interaction.replied) {
      return this.interaction.editReply(payload);
    }
    const replyPayload = { ...payload };
    if (this.ephemeral) replyPayload.flags = MessageFlags.Ephemeral;
    await this.interaction.reply(replyPayload);
    return this.interaction.fetchReply();
  }

  _startCollector(message) {
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.customId === this.prevId || i.customId === this.nextId,
      time: this.timeout,
    });

    collector.on('collect', async (i) => {
      // Caller-Restriction
      if (this.restrictToCaller && i.user.id !== this.interaction.user.id) {
        return i
          .reply({
            content: '`❌` Diese Buttons sind nicht für dich.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }

      if (i.customId === this.prevId) this.currentPage -= 1;
      else if (i.customId === this.nextId) this.currentPage += 1;

      // Clamp falls totalPages sich geändert hat (z.B. neue Einträge dazugekommen)
      const { embed, totalPages } = await this.fetchPage(this.currentPage);
      this.totalPages = Math.max(1, totalPages);
      this.currentPage = Math.max(0, Math.min(this.currentPage, this.totalPages - 1));

      await i
        .update({ embeds: [embed], components: [this._buildRow()] })
        .catch((err) => console.error('[Pagination] update fehlgeschlagen:', err));
    });

    collector.on('end', async () => {
      // Buttons komplett disablen wenn Collector abläuft
      await this.interaction
        .editReply({ components: [this._buildRow(true)] })
        .catch(() => {}); // Message evtl. schon gelöscht / Token abgelaufen
    });
  }
}

module.exports = Pagination;