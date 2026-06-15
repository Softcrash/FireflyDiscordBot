const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class LogSetting extends Model {}

LogSetting.init(
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
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    channelId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    webhookId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    webhookTooken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'LogSetting',
    tableName: 'log_settings',
    indexes: [
      { unique: true, fields: ['guildId', 'category'] },
    ],
  }
);

module.exports = LogSetting;