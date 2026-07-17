const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

// Ein Benachrichtigungs-Channel pro Guild für Plugin-Statusänderungen.
// Row vorhanden = Benachrichtigungen aktiv, Row gelöscht = aus.
class PluginNotifySetting extends Model {}

PluginNotifySetting.init(
  {
    guildId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    channelId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'PluginNotifySetting',
    tableName: 'plugin_notify_settings',
  }
);

module.exports = PluginNotifySetting;