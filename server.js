const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-가-힣]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage });

app.get("/", (_, res) => res.sendFile(path.join(__dirname, "public/index.html")));

app.post("/api/reports", upload.array("photos", 10), (req, res) => {
  try {
    const b = req.body;

    const work_process = JSON.stringify(
      Array.isArray(b.work_process) ? b.work_process : (b.work_process ? [b.work_process] : [])
    );

    const stmt = `
      INSERT INTO daily_report (
        project_name, site_name, report_date, writer, weather, temp_c,
        work_process, work_content,
        manpower_direct, manpower_sub,
        equipment_note, material_note, material_issue,
        issues, plan_next
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const params = [
      b.project_name?.trim(),
      b.site_name?.trim(),
      b.report_date,
      b.writer?.trim(),
      b.weather || null,
      b.temp_c ? Number(b.temp_c) : null,
      work_process,
      b.work_content || null,
      b.manpower_direct ? Number(b.manpower_direct) : null,
      b.manpower_sub ? Number(b.manpower_sub) : null,
      b.equipment_note || null,
      b.material_note || null,
      b.material_issue || null,
      b.issues || null,
      b.plan_next || null,
    ];

    if (!params[0] || !params[1] || !params[2] || !params[3]) {
      return res.status(400).json({ error: "필수값(공사명/현장명/작성일/작성자)이 누락되었습니다." });
    }

    db.run(stmt, params, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const reportId = this.lastID;

      const files = req.files || [];
      if (files.length === 0) return res.json({ id: reportId });

      const imgStmt = db.prepare(
        `INSERT INTO report_image (report_id, file_path, original_name) VALUES (?,?,?)`
      );
      for (const f of files) {
        imgStmt.run(reportId, `/uploads/${path.basename(f.path)}`, f.originalname);
      }
      imgStmt.finalize(() => res.json({ id: reportId }));
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/reports", (req, res) => {
  const { from, to, q } = req.query;

  let where = [];
  let params = [];

  if (from) { where.push("report_date >= ?"); params.push(from); }
  if (to) { where.push("report_date <= ?"); params.push(to); }
  if (q) {
    where.push("(project_name LIKE ? OR site_name LIKE ? OR writer LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const sql = `
    SELECT id, project_name, site_name, report_date, writer, weather, created_at
    FROM daily_report
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY report_date DESC, id DESC
    LIMIT 200
  `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/reports/:id", (req, res) => {
  const id = Number(req.params.id);
  db.get(`SELECT * FROM daily_report WHERE id = ?`, [id], (err, report) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!report) return res.status(404).json({ error: "Not found" });

    db.all(`SELECT * FROM report_image WHERE report_id = ? ORDER BY id ASC`, [id], (e2, imgs) => {
      if (e2) return res.status(500).json({ error: e2.message });
      report.work_process = safeJson(report.work_process);
      res.json({ report, images: imgs });
    });
  });
});

function safeJson(s) {
  try { return s ? JSON.parse(s) : []; } catch { return []; }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
