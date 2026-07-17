require('colors');

const { loadAll } = require('../../utils/plugins/pluginState');
const { isValidPluginId, getAllPlugins } = require('../../utils/plugins/pluginRegistry');
const getLocalCommands = require('../../utils/getLocalCommands');
const getButtons = require('../../utils/getButtons');
const getSelects = require('../../utils/getSelects');
const getModals = require('../../utils/getModals');

function collectTaggedHandlers() {
  const entries = [];

  for (const cmd of getLocalCommands()) {
    entries.push({ label: `Command /${cmd.data?.name ?? '?'}`, category: cmd.category });
  }
  for (const btn of getButtons()) {
    entries.push({ label: `Button ${btn.customId ?? btn.customIdPrefix ?? '?'}`, category: btn.category });
  }
  for (const sel of getSelects()) {
    entries.push({ label: `Select ${sel.customId ?? '?'}`, category: sel.category });
  }
  for (const mdl of getModals()) {
    entries.push({ label: `Modal ${mdl.customId ?? '?'}`, category: mdl.category });
  }

  return entries;
}

module.exports = async (client) => {
  try {
    const rowCount = await loadAll();
    console.log(
      `[plugins] ${getAllPlugins().length} Plugins registriert, ${rowCount} Guild-Einstellungen geladen`
    );
  } catch (err) {
    console.error('[plugins] Cache-Load fehlgeschlagen (Fail-Open aktiv):', err);
  }

  try {
    for (const { label, category } of collectTaggedHandlers()) {
      if (category && !isValidPluginId(category)) {
        console.warn(
          `[plugins] Unbekannte category '${category}' an ${label} — Handler läuft ungegated (Fail-Open)`.yellow
        );
      }
    }
  } catch (err) {
    console.error('[plugins] Tag-Validierung fehlgeschlagen:', err);
  }
};