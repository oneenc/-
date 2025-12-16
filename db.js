const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      report_date DATE,
      project_name TEXT,
      site_name TEXT,
      writer TEXT,
      weather TEXT,
      temp_c TEXT,
      work_process TEXT[],
      work_content TEXT,
      manpower_direct INTEGER,
      manpower_sub INTEGER,
      equipment_note TEXT,
      material_note TEXT,
      material_issue TEXT,
      issues TEXT,
      plan_next TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
      file_path TEXT,
      original_name TEXT
    )
  `);
}

module.exports = { pool, initDB };
