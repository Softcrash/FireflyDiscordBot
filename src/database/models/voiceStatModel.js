const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class VoiceStat extends Model {}

VoiceStat.init(
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
      type: DataTypes.STRING,
      allowNull: false,
    },
    channelId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    // Minuten (Integer reicht, Sub-Minuten-Genauigkeit nicht nötig)
    minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'VoiceStat',
    tableName: 'voice_stats',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['guildId', 'userId', 'channelId', 'date'],
        name: 'voice_stats_unique',
      },
      { fields: ['guildId', 'date'] },
      { fields: ['guildId', 'userId'] },
      { fields: ['guildId', 'channelId'] },
    ],
  }
);

module.exports = VoiceStat;