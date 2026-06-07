const { EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ticketConfig = require('../tickets/ticketConfig');

const buttonStyles = {
  ticketClaim: { label: '🙋 Claim', style: ButtonStyle.Primary },
  ticketClose: { label: '🔒 Schließen', style: ButtonStyle.Danger },
};

/**
 * Liest den Wert eines Modal-Feldes je nach Typ aus
 * @param {ModalSubmitFields} fields - interaction.fields
 * @param {Object} field - Feld-Definition aus ticketConfig
 * @returns {string} Der ausgelesene Wert
 */
function getFieldValue(fields, field) {
  switch (field.type) {
    case 'select': {
      const selectField = fields.getField(field.inputId);
      return selectField?.values?.[0] || 'Keine Auswahl';
    }
    case 'text':
    default:
      return fields.getTextInputValue(field.inputId);
  }
}

/**
 * Extrahiert hochgeladene Dateien aus einem Modal-File-Field
 * @param {ModalSubmitFields} fields
 * @param {string} inputId
 * @returns {Array<{attachment: string, name: string}>}
 */
function extractUploadedFiles(fields, inputId) {
  try {
    const result = fields.getUploadedFiles(inputId);
    if (!result) return [];

    // getUploadedFiles kann Collection oder Array zurückgeben — beides abdecken
    const fileList = Array.isArray(result) ? result : [...result.values()];

    return fileList.map(file => ({
      attachment: file.url,
      name: file.name,
    }));
  } catch {
    // Kein File hochgeladen (bei optional) — leerer Array
    return [];
  }
}

/**
 * Erstellt ein Ticket basierend auf dem Ticket-Typ
 * @param {ModalSubmitInteraction} interaction
 * @param {string} ticketType - Der Ticket-Typ (z.B. 'report', 'application')
 */
async function createTicket(interaction, ticketType) {
  const config = ticketConfig[ticketType];

  if (!config) {
    return interaction.editReply({ content: `❌ Unbekannter Ticket-Typ: ${ticketType}` });
  }

  const { fields, guild, member, channel } = interaction;

  // Thread erstellen
  let thread;
  try {
    thread = await channel.threads.create({
      name: `${config.icon} ${config.threadPrefix}-${member.user.username}`,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `${config.title} von ${member.user.tag}`,
    });
  } catch (err) {
    console.error(`[Ticket] Thread erstellen fehlgeschlagen (${ticketType}):`, err);
    return interaction.editReply({ content: '❌ Ticket konnte nicht erstellt werden.' });
  }

  // Buttons erstellen
  const ticketButtons = new ActionRowBuilder();
  config.buttons.forEach(buttonId => {
    if (buttonStyles[buttonId]) {
      ticketButtons.addComponents(
        new ButtonBuilder()
          .setCustomId(buttonId)
          .setLabel(buttonStyles[buttonId].label)
          .setStyle(buttonStyles[buttonId].style)
      );
    }
  });

  // Embed Felder vorbereiten
  const embedFields = [
    { name: '👤 Eingereicht von', value: `${member} (\`${member.user.tag}\`)`, inline: true },
    { name: '🕐 Erstellt am', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    { name: '\u200b', value: '\u200b', inline: false }
  ];

  // Anhänge sammeln (File-Felder werden separat behandelt)
  const attachments = [];

  // Dynamische Felder hinzufügen
  config.fields.forEach(field => {
    if (field.type === 'file') {
      // File-Field: Dateien sammeln, Filenamen im Embed listen
      const files = extractUploadedFiles(fields, field.inputId);
      if (files.length > 0) {
        attachments.push(...files);
        embedFields.push({
          name: field.embedName,
          value: files.map((f, i) => `\`${i + 1}.\` ${f.name}`).join('\n'),
          inline: field.inline,
        });
      }
      return;
    }

    // Text- oder Select-Field
    const value = getFieldValue(fields, field);
    embedFields.push({
      name: field.embedName,
      value: `\`\`\`${value}\`\`\``,
      inline: field.inline
    });
  });

  // Embed erstellen
  const embed = new EmbedBuilder()
    .setTitle(`${config.icon} ${config.title}`)
    .setColor(config.color)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(embedFields)
    .setFooter({ text: `Ticket-System • ${config.title}`, iconURL: guild.iconURL({ dynamic: true }) })
    .setTimestamp();

  // Nachricht senden — der Rollen-Ping added automatisch alle Teammitglieder zum Thread
  // Dateien werden re-uploaded und permanent gehostet
  const roleMentions = config.teamRoleIds.map(roleId => `<@&${roleId}>`).join(' ');
  await thread.send({
    content: `${member} | ${roleMentions}`,
    embeds: [embed],
    components: [ticketButtons],
    files: attachments, // leeres Array ist OK
  });

  // User Bestätigung
  await interaction.editReply({
    content: `✅ Dein ${config.title} wurde eingereicht! ${thread}`,
  });
}

/**
 * Prüft ob ein User bereits ein offenes Ticket in dieser Kategorie hat
 * @param {Guild} guild - Discord Guild
 * @param {string} userId - Discord User ID
 * @param {string} categoryKey - Kategorie Key (z.B. 'report', 'bewerbung')
 * @param {string} ticketChannelId - Channel ID wo Tickets erstellt werden
 * @returns {Promise<Object|null>} Thread object wenn offen, null wenn nicht
 */
async function getOpenTicketInCategory(guild, userId, categoryKey, ticketChannelId) {
  try {
    const ticketChannel = await guild.channels.fetch(ticketChannelId);
    if (!ticketChannel) return null;

    const threads = await ticketChannel.threads.fetch();

    const categoryMap = {
      'comfySlct': 'comfy',
      'application': 'application',
      'support': 'support',
      'partnerschaft': 'partnerschaft',
      'reportSlct': 'report',
    };

    const threadPrefix = categoryMap[categoryKey];
    if (!threadPrefix) return null;

    for (const thread of threads.values()) {
      const isOpen = !thread.archived;
      const hasPrefix = thread.name.includes(threadPrefix);

      if (isOpen && hasPrefix) {
        try {
          const firstMessage = await thread.messages.fetch({ limit: 1 });
          const creator = firstMessage.first()?.author?.id;

          if (creator === userId) {
            return thread;
          }
        } catch (err) {
          console.error('[Ticket] Fehler beim Abrufen der Thread-Messages:', err);
        }
      }
    }

    return null;
  } catch (err) {
    console.error('[Ticket] Fehler beim Prüfen offener Tickets:', err);
    return null;
  }
}

module.exports = { createTicket, getOpenTicketInCategory };