const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const DB_PATH = path.join(__dirname, '../../data/db');

async function loadDatabase(type) {
  const filePath = path.join(DB_PATH, `${type}.csv`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

async function saveDatabase(type, data) {
  const filePath = path.join(DB_PATH, `${type}.csv`);
  const content = stringify(data, { header: true });
  fs.writeFileSync(filePath, content);
  return { success: true };
}

module.exports = { loadDatabase, saveDatabase };
