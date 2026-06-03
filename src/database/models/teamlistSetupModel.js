const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class TeamlistSetup extends Model {}

TeamlistSetup.init(
  {
    guildId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    // Channel + Message des geposteten Panels — für den Refresh-Button
    channelId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    messageId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Array der ausgewählten Team-Rollen-IDs (wird als JSON gespeichert)
    // Kein DDL-Default, da MariaDB für TEXT/JSON-Spalten keine Defaults erlaubt —
    // wir setzen den Wert immer explizit beim upsert.
    roleIds: {
      type: DataTypes.JSON,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'TeamlistSetup',
    tableName: 'teamlist_setups',
  }
);

module.exports = TeamlistSetup;