require("colors");

const commandComparing = require("../../utils/commandComparing");
const getApplicationCommands = require("../../utils/getApplicationCommands");
const getLocalCommands = require("../../utils/getLocalCommands");
const { testServerId } = require("../../config.json");

/**
 * Synct eine Liste lokaler Commands mit einem Command-Manager
 * (entweder global oder für einen bestimmten Guild).
 *
 * @param {import('discord.js').ApplicationCommandManager|import('discord.js').GuildApplicationCommandManager} applicationCommands
 * @param {Array} localCommands
 * @param {string} scopeLabel  Nur fürs Logging ("global" / "testServer")
 */
const syncCommands = async (applicationCommands, localCommands, scopeLabel) => {
  for (const localCommand of localCommands) {
    // .toJSON() ist der offizielle Weg in discord.js v14, um aus dem Builder
    // den korrekten API-Payload zu bauen — er enthält u.a. die `type`-Felder
    // für Subcommands, die sonst verloren gehen würden.
    const commandPayload = localCommand.data.toJSON();
    const commandName = commandPayload.name;

    const existingCommand = applicationCommands.cache.find(
      (cmd) => cmd.name === commandName
    );

    if (existingCommand) {
      if (localCommand.deleted) {
        await applicationCommands.delete(existingCommand.id);
        console.log(
          `[${scopeLabel}] Application command ${commandName} has been deleted.`.red
        );
        continue;
      }

      if (commandComparing(existingCommand, localCommand)) {
        await applicationCommands.edit(existingCommand.id, commandPayload);
        console.log(
          `[${scopeLabel}] Application command ${commandName} has been edited.`.yellow
        );
      }
    } else {
      if (localCommand.deleted) {
        console.log(
          `[${scopeLabel}] Application command ${commandName} has been skipped, since property "deleted" is set to "true".`
            .grey
        );
        continue;
      }

      await applicationCommands.create(commandPayload);
      console.log(
        `[${scopeLabel}] Application command ${commandName} has been registered.`.green
      );
    }
  }
};

module.exports = async (client) => {
  try {
    const localCommands = getLocalCommands();

    // Commands aufteilen: testMode → nur Testserver, sonst → global
    const testCommands = localCommands.filter((cmd) => cmd.testMode);
    const globalCommands = localCommands.filter((cmd) => !cmd.testMode);

    // --- Global ---
    const globalApplicationCommands = await getApplicationCommands(client);

    // Falls ein testMode-Command vorher mal global registriert war, hier global entfernen
    for (const testCommand of testCommands) {
      const stale = globalApplicationCommands.cache.find(
        (cmd) => cmd.name === testCommand.data.name
      );
      if (stale) {
        await globalApplicationCommands.delete(stale.id);
        console.log(
          `[global] Stale testMode command ${testCommand.data.name} wurde global entfernt.`.red
        );
      }
    }

    await syncCommands(globalApplicationCommands, globalCommands, "global");

    // --- Testserver ---
    if (!testServerId) {
      if (testCommands.length > 0) {
        console.log(
          `[testServer] testMode-Commands gefunden, aber kein testServerId in config.json — übersprungen.`.yellow
        );
      }
      return;
    }

    const testServerApplicationCommands = await getApplicationCommands(
      client,
      testServerId
    );

    await syncCommands(
      testServerApplicationCommands,
      testCommands,
      "testServer"
    );
  } catch (err) {
    console.log(`An error occurred while registering commands! ${err}`.red);
  }
};