const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class Counting extends Model {}

Counting.init(
  {
    guildId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    currentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastUserId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    highScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Counting',
    tableName: 'counting_states',
  }
);

module.exports = Counting;