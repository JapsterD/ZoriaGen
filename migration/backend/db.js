const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'migrations.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solana_tx TEXT UNIQUE NOT NULL,
      bsc_tx TEXT,
      sender_solana TEXT NOT NULL,
      receiver_bsc TEXT NOT NULL,
      amount_sent REAL NOT NULL,
      amount_receive REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_migrations_solana_tx ON migrations(solana_tx);
    CREATE INDEX IF NOT EXISTS idx_migrations_status ON migrations(status);
  `);
}

function createMigration({ solanaTx, senderSolana, receiverBsc, amountSent, amountReceive }) {
  const stmt = getDb().prepare(`
    INSERT INTO migrations (solana_tx, sender_solana, receiver_bsc, amount_sent, amount_receive, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `);
  try {
    const result = stmt.run(solanaTx, senderSolana, receiverBsc, amountSent, amountReceive);
    return result.lastInsertRowid;
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return null;
    }
    throw err;
  }
}

function getMigrationByTx(solanaTx) {
  return getDb().prepare('SELECT * FROM migrations WHERE solana_tx = ?').get(solanaTx);
}

function getMigrationById(id) {
  return getDb().prepare('SELECT * FROM migrations WHERE id = ?').get(id);
}

function updateMigrationStatus(solanaTx, status, bscTx = null, error = null) {
  const stmt = getDb().prepare(`
    UPDATE migrations
    SET status = ?, bsc_tx = COALESCE(?, bsc_tx), error = ?, updated_at = CURRENT_TIMESTAMP
    WHERE solana_tx = ?
  `);
  return stmt.run(status, bscTx, error, solanaTx);
}

function getPendingMigrations() {
  return getDb().prepare("SELECT * FROM migrations WHERE status = 'pending' ORDER BY created_at ASC").all();
}

function getRecentMigrations(limit = 20) {
  return getDb().prepare('SELECT * FROM migrations ORDER BY created_at DESC LIMIT ?').all(limit);
}

module.exports = {
  getDb,
  createMigration,
  getMigrationByTx,
  getMigrationById,
  updateMigrationStatus,
  getPendingMigrations,
  getRecentMigrations,
};
