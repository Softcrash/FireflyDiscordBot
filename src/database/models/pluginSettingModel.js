const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class PluginSetting extends Model {}

PluginSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    guildId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pluginId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // Für spätere Fehlerbehandlung: Plugin wurde automatisch deaktiviert
    // (z.B. nach wiederholten Fehlern). /plugin enable setzt beides zurück.
    autoDisabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    disabledReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'PluginSetting',
    tableName: 'plugin_settings',
    indexes: [
      { unique: true, fields: ['guildId', 'pluginId'] },
    ],
  }
);

module.exports = PluginSetting;