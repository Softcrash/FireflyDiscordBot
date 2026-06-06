const fs = require('node:fs');
const path = require('node:path');
const sequelize = require('./sequelize');

const models = {};
const modelsPath = path.join(__dirname, 'models');

for (const file of fs.readdirSync(modelsPath).filter(f => f.endsWith('.js'))) {
  const model = require(path.join(modelsPath, file));
  models[model.name] = model;
}

// Assoziationen aufbauen
for (const name of Object.keys(models)) {
  if (typeof models[name].associate === 'function') {
    models[name].associate(models);
  }
}

module.exports = { sequelize, ...models };