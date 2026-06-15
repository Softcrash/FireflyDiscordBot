// Zentrale Metadaten der Logging-Kategorien + Farbpalette.

const CATEGORIES = {
  voice: {
    key: 'voice',
    label: 'Voice Logs',
    emoji: '🔊',
    description: 'Joins, Leaves, Mute/Taub, Streams, Kamera',
  },
  message: {
    key: 'message',
    label: 'Nachrichten Logs',
    emoji: '✉️',
    description: 'Gelöschte & bearbeitete Nachrichten',
  },
  server: {
    key: 'server',
    label: 'Server Logs',
    emoji: '🛠️',
    description: 'Channels, Rollen, Emojis, Servereinstellungen',
  },
  user: {
    key: 'user',
    label: 'User Logs',
    emoji: '👤',
    description: 'Joins, Leaves, Nickname, Rollen, Bans',
  },
};

const CATEGORY_ORDER = ['voice', 'message', 'server', 'user'];

const COLORS = {
  create: 0x00d26a, // Erstellt / Join (entspricht embedColorSuccess)
  delete: 0xfb2f61, // Gelöscht / Leave / Ban (entspricht embedColorError)
  update: 0xffcc4d, // Bearbeitet / Geändert (entspricht embedColorWarning)
  voice: 0x5865f2, // Voice / neutral
  neutral: 0x5865f2,
};

module.exports = { CATEGORIES, CATEGORY_ORDER, COLORS };