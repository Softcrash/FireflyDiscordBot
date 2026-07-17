const PLUGINS = [
  {
    id: 'moderation',
    name: 'Moderation',
    description: 'Mod-Commands wie Channel-Lock, Infractions & Co.',
    defaultEnabled: true,
  },
  {
    id: 'logging',
    name: 'Logging',
    description: 'Webhook-basierte Server-, User- und Nachrichten-Logs.',
    defaultEnabled: true,
  },
  {
    id: 'stats',
    name: 'Statistiken',
    description: 'Nachrichten- und Voice-Statistiken (Panels).',
    defaultEnabled: true,
  },
  {
    id: 'tickets',
    name: 'Tickets',
    description: 'Ticket-System mit Bewerbungs- und Support-Panels.',
    defaultEnabled: true,
  },
  {
    id: 'fun',
    name: 'Games & Fun',
    description: 'Spiele und Spaß-Commands.',
    defaultEnabled: true,
  },
  {
    id: 'counting',
    name: 'Counting',
    description: 'Zähl-Channel mit Regeln und Highscore.',
    defaultEnabled: true,
  },
];

// Lookup-Map für O(1)-Zugriff, einmal beim Require aufgebaut
const byId = new Map(PLUGINS.map((p) => [p.id, p]));

function getPlugin(id) {
  return byId.get(id) ?? null;
}

function getAllPlugins() {
  return PLUGINS;
}

function isValidPluginId(id) {
  return byId.has(id);
}

module.exports = { PLUGINS, getPlugin, getAllPlugins, isValidPluginId };