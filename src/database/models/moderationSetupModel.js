const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class ModerationSetup extends Model {}

ModerationSetup.init(
  {
    guildId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    modLogChannelId: {
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
    modelName: 'ModerationSetup',
    tableName: 'moderation_setups',
  }
);

module.exports = ModerationSetup;