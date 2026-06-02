const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', process.env.DB_FILE || 'db.json');

// Serializes async writes so concurrent requests don't clobber each other.
let writeChain = Promise.resolve();

function ensureDbFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2), 'utf-8');
  }
}

async function readDb() {
  ensureDbFile();
  const raw = await fs.promises.readFile(DB_PATH, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    // Normalize the top-level collections so routes can assume they exist.
    if (!Array.isArray(parsed.users)) parsed.users = [];
    if (!Array.isArray(parsed.connections)) parsed.connections = [];
    if (!Array.isArray(parsed.messages)) parsed.messages = [];
    return parsed;
  } catch (err) {
    throw new Error(`Corrupt db.json: ${err.message}`);
  }
}

async function writeDb(data) {
  ensureDbFile();
  writeChain = writeChain.then(() =>
    fs.promises.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
  );
  return writeChain;
}

async function updateUser(userId, mutator) {
  const db = await readDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const updated = mutator({ ...db.users[idx] });
  db.users[idx] = updated;
  await writeDb(db);
  return updated;
}

// Read–modify–write the whole db in one serialized step. The mutator receives
// the parsed db, mutates it in place (or returns a new object), and whatever it
// returns (or the same db) is persisted. Returns the mutator's return value.
async function updateDb(mutator) {
  const db = await readDb();
  const result = await mutator(db);
  await writeDb(db);
  return result;
}

module.exports = { readDb, writeDb, updateUser, updateDb, DB_PATH };
