const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DEFAULT_DATABASE_PATH = "./applications.db";

function resolveDatabasePath() {
  return path.resolve(process.cwd(), process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH);
}

async function initDatabase() {
  const databasePath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      level TEXT NOT NULL,
      goal TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      preferred_time TEXT NOT NULL,
      demo_consent INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL
    )
  `);

  const insertApplicationStatement = db.prepare(`
    INSERT INTO applications (
      name,
      contact,
      level,
      goal,
      difficulty,
      preferred_time,
      demo_consent,
      status,
      created_at
    )
    VALUES (
      @name,
      @contact,
      @level,
      @goal,
      @difficulty,
      @preferred_time,
      @demo_consent,
      @status,
      @created_at
    )
  `);

  const findApplicationByIdStatement = db.prepare(`
    SELECT
      id,
      name,
      contact,
      level,
      goal,
      difficulty,
      preferred_time,
      demo_consent,
      status,
      created_at
    FROM applications
    WHERE id = ?
  `);

  const listApplicationsStatement = db.prepare(`
    SELECT
      id,
      name,
      contact,
      level,
      goal,
      difficulty,
      preferred_time,
      demo_consent,
      status,
      created_at
    FROM applications
    ORDER BY datetime(created_at) DESC, id DESC
  `);

  const updateStatusStatement = db.prepare(`
    UPDATE applications
    SET status = @status
    WHERE id = @id
  `);

  function createApplication(application) {
    const result = insertApplicationStatement.run(application);
    return findApplicationById(result.lastInsertRowid);
  }

  function findApplicationById(id) {
    return findApplicationByIdStatement.get(id);
  }

  function getApplications() {
    return listApplicationsStatement.all();
  }

  function updateApplicationStatus(id, status) {
    const result = updateStatusStatement.run({ id, status });

    if (!result.changes) {
      return null;
    }

    return findApplicationById(id);
  }

  return {
    createApplication,
    databasePath,
    getApplications,
    updateApplicationStatus,
  };
}

module.exports = {
  initDatabase,
};
