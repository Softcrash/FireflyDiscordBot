const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class CountingSetup extends Model {}

CountingSetup.init(
  {
    guildId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    channelId: {
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
    modelName: 'CountingSetup',
    tableName: 'counting_setups',
  }
);

module.exports = CountingSetup;