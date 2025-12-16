const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "daily_reports.sqlite");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_report (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_name TEXT NOT NULL,
      site_name TEXT NOT NULL,
      report_date TEXT NOT NULL,
      writer TEXT NOT NULL,
      weather TEXT,
      temp_c REAL,
      work_process TEXT,
      work_content TEXT,
      manpower_direct INTEGER,
      manpower_sub INTEGER,
      equipment_note TEXT,
      material_note TEXT,
      material_issue TEXT,
      issues TEXT,
      plan_next TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS report_image (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(report_id) REFERENCES daily_report(id)
    )
  `);
});

module.exports = db;
