module.exports = {
  report: {
    teamRoleIds: ['1491473710471843990', '1491474312883077402'],
    icon: '🚨',
    title: 'Report',
    color: 0xe74c3c,
    threadPrefix: 'report',
    fields: [
      { inputId: 'report_user', embedName: '🎯 Gemeldeter User', inline: false },
      { inputId: 'report_grund', embedName: '📌 Grund', inline: false },
      { inputId: 'report_beschreibung', embedName: '📝 Beschreibung', inline: false },
      { inputId: 'report_dateien', embedName: '📎 Anhänge', inline: false, type: 'file' },
    ],
    buttons: ['ticketClose'],
  },
  application: {
  teamRoleIds: ['1501651717324935408'],
  icon: '📋',
  title: 'Bewerbung',
  color: 0x3498db,
  threadPrefix: 'bewerbung',
  fields: [
    { inputId: 'bewerbung_position', embedName: '⭐ Position', inline: true, type: 'select' },
    { inputId: 'bewerbung_alter', embedName: '🎂 Alter', inline: true },
    { inputId: 'bewerbung_text', embedName: '📝 Bewerbung', inline: false }, // ← bewerbung_erfahrung → bewerbung_text
  ],
  buttons: ['ticketClose'],
},
  comfy: {
    teamRoleIds: ['1509486509450072105', '1505932260258611332'],
    icon: '🌻',
    title: '🌿✨ Willkommen im Bewerbungsticket für den Dreamy Garden!',
    color: 0x9b59b6,
    threadPrefix: 'dreamy-anfrage',
    fields: [
      { inputId: 'dreamy_reason', embedName: '🪻 Warum möchtest du dem Dreamy Garden beitreten?', inline: false },
      { inputId: 'dreamy_wunsch', embedName: '🪻 Was wünschst du dir von diesem Bereich?', inline: false },
      { inputId: 'dreamy_self', embedName: '🪻 Wie würdest du dich selbst in 3 Worten beschreiben?', inline: false },
    ],
    buttons: ['ticketClose'],
  },
  partner: {
    teamRoleIds: ['1491473192055865478'],
    icon: '🤝',
    title: 'Partner',
    color: 0x9b59b6,
    threadPrefix: 'partner-anfrage',
    fields: [
      { inputId: 'partnerschaft_server', embedName: '🖥️ Server', inline: true },
      { inputId: 'partnerschaft_member', embedName: '👽 Member', inline: true },
      { inputId: 'partnerschaft_angebot', embedName: '⭐ Vorstellungen', inline: false },
    ],
    buttons: ['ticketClose'],
  },
  tech: {
    teamRoleIds: ['1491476448270094377'],
    icon: '🔧',
    title: 'Tech Report',
    color: 0xf39c12,
    threadPrefix: 'tech-report',
    fields: [
      { inputId: 'tech_problem', embedName: '🐛 Problem', inline: false },
      { inputId: 'tech_steps', embedName: '📝 Schritte zum Reproduzieren', inline: false },
    ],
    buttons: ['ticketClose'],
  },
  admin: {
    teamRoleIds: ['1491473403196997773', '1491399551498719352'],
    icon: '📓',
    title: 'Admin Report',
    color: 0xf39c12,
    threadPrefix: 'admin-report',
    fields: [
      { inputId: 'admin_report', embedName: '📝 Anliegen', inline: false },
    ],
    buttons: ['ticketClose'],
  },
  support: {
    teamRoleIds: ['1491474529439187125', '1491473710471843990', '1491474312883077402'],
    icon: '✉️',
    title: 'support',
    color: 0xf39c12,
    threadPrefix: 'support',
    fields: [
      { inputId: 'support_thema', embedName: '📂 Frage', inline: true },
    ],
    buttons: ['ticketClose'],
  },
};