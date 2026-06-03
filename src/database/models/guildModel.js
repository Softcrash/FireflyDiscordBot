const { DataTypes, Model } = require('sequelize');
const sequelize = require('../sequelize');

class Guild extends Model {}

Guild.init({
  id: { type: DataTypes.STRING, primaryKey: true },
  name: DataTypes.STRING,
}, { sequelize, modelName: 'Guild', tableName: 'guilds' });

module.exports = Guild;