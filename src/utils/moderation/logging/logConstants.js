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
  create: 0x00d26a,
  delete: 0xfb2f61,
  update: 0xffcc4d,
  voice: 0x5865f2,
  neutral: 0x5865f2,
};

const CATEGORY_EVENTS = {
  voice: [
    { key: 'voiceJoin', label: 'Voice-Join' },
    { key: 'voiceLeave', label: 'Voice-Leave' },
    { key: 'voiceMove', label: 'Voice-Wechsel' },
    { key: 'voiceState', label: 'Mute/Taub/Stream/Kamera' },
  ],
  message: [
    { key: 'messageDelete', label: 'Nachricht gelöscht' },
    { key: 'messageUpdate', label: 'Nachricht bearbeitet' },
    { key: 'messageDeleteBulk', label: 'Massenlöschung' },
  ],
  user: [
    { key: 'memberJoin', label: 'Mitglied beigetreten' },
    { key: 'memberLeave', label: 'Verlassen / Kick' },
    { key: 'memberUpdate', label: 'Nickname / Rollen / Timeout / Boost' },
    { key: 'userUpdate', label: 'Username / Avatar (global)' },
    { key: 'banAdd', label: 'Bann' },
    { key: 'banRemove', label: 'Entbannung' },
  ],
  server: [
    { key: 'channelCreate', label: 'Channel erstellt' },
    { key: 'channelDelete', label: 'Channel gelöscht' },
    { key: 'channelUpdate', label: 'Channel geändert' },
    { key: 'roleCreate', label: 'Rolle erstellt' },
    { key: 'roleDelete', label: 'Rolle gelöscht' },
    { key: 'roleUpdate', label: 'Rolle geändert' },
    { key: 'emoji', label: 'Emojis' },
    { key: 'sticker', label: 'Sticker' },
    { key: 'guildUpdate', label: 'Servereinstellungen' },
    { key: 'invite', label: 'Einladungen' },
    { key: 'thread', label: 'Threads' },
    { key: 'webhookUpdate', label: 'Webhooks' },
    { key: 'scheduledEvent', label: 'Geplante Events' },
    { key: 'autoMod', label: 'AutoMod' },
  ],
};

module.exports = { CATEGORIES, CATEGORY_ORDER, COLORS, CATEGORY_EVENTS };