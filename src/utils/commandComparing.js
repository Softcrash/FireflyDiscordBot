/**
 * Normalisiert ein einzelnes Application-Command-Option-Objekt in eine
 * vergleichbare Form (rekursiv für Subcommands & Subcommand-Groups).
 *
 * Wir behalten nur die Felder, die für die Funktionalität relevant sind —
 * alles andere (Localizations, interne IDs etc.) wird ignoriert.
 */
const normalizeOption = (option) => ({
  type: option.type,
  name: option.name,
  description: option.description,
  required: option.required ?? false,
  options: option.options?.length ? option.options.map(normalizeOption) : undefined,
  choices: option.choices?.length
    ? option.choices.map((c) => ({ name: c.name, value: c.value }))
    : undefined,
});

/**
 * Vergleicht den auf Discord registrierten Command (`existing`) mit der lokalen
 * Builder-Definition (`local`). Liefert `true` wenn sich etwas geändert hat
 * und der Command neu registriert / editiert werden muss.
 *
 * Wichtig: wir lesen die lokale Definition über `local.data.toJSON()`. Das
 * liefert die offizielle API-Form (inkl. `type`-Feld für Subcommands), die
 * sich konsistent gegen die Discord-Antwort vergleichen lässt.
 *
 * @param {import('discord.js').ApplicationCommand} existing
 * @param {{ data: import('discord.js').SlashCommandBuilder }} local
 * @returns {boolean} true wenn unterschiedlich
 */
module.exports = (existing, local) => {
  const localPayload = local.data.toJSON();

  if (existing.name !== localPayload.name) return true;
  if ((existing.description || '') !== (localPayload.description || '')) return true;

  const existingOptions = (existing.options || []).map(normalizeOption);
  const localOptions = (localPayload.options || []).map(normalizeOption);

  return JSON.stringify(existingOptions) !== JSON.stringify(localOptions);
};