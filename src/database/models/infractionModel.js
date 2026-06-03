const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class Infraction extends Model {}

Infraction.init(
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
    userId: {
      // Target des Mod-Eingriffs
      type: DataTypes.STRING,
      allowNull: false,
    },
    moderatorId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      // 'warn' | 'timeout' | 'ban'
      type: DataTypes.STRING,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    durationSeconds: {
      // nur bei Timeout
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    expiresAt: {
      // nur bei Timeout
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Infraction',
    tableName: 'infractions',
    indexes: [
      { fields: ['guildId', 'userId'] },
      { fields: ['guildId', 'moderatorId'] },
    ],
  }
);

module.exports = Infraction;