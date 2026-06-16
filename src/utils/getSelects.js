// FILE: src/utils/getSelects.js
const path = require("path");
const getAllFiles = require("./getAllFiles");

module.exports = (exceptions = []) => {
  let selects = [];
  const selectFiles = getAllFiles(path.join(__dirname, "..", "selects"));

  for (const selectFile of selectFiles) {
    const selectObject = require(selectFile);

    // Unterstützt sowohl einzelne Objekte als auch Arrays von Objekten
    const items = Array.isArray(selectObject) ? selectObject : [selectObject];

    for (const item of items) {
      if (exceptions.includes(item.name)) continue;
      selects.push(item);
    }
  }

  return selects;
};