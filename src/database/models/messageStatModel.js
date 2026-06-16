const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class MessageStat extends Model {}

MessageStat.init(
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
    // Datum als DATEONLY (YYYY-MM-DD) — kein Timestamp, damit GROUP BY einfach bleibt
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'MessageStat',
    tableName: 'message_stats',
    timestamps: false,
    indexes: [
      // Haupt-Upsert-Index
      {
        unique: true,
        fields: ['guildId', 'userId', 'channelId', 'date'],
        name: 'msg_stats_unique',
      },
      { fields: ['guildId', 'date'] },
      { fields: ['guildId', 'userId'] },
      { fields: ['guildId', 'channelId'] },
    ],
  }
);

module.exports = MessageStat;