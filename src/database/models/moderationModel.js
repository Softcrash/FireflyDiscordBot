const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class ModerationPermission extends Model {}

ModerationPermission.init(
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
    command: {
      // 'ban' | 'warn' | 'timeout'
      type: DataTypes.STRING,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ModerationPermission',
    tableName: 'moderation_permissions',
    indexes: [
      {
        unique: true,
        fields: ['guildId', 'command', 'roleId'],
      },
    ],
  }
);

module.exports = ModerationPermission;