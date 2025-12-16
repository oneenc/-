const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { pool, initDB } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

initDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});
const upload = multer({ storage });

/* 공사일보 등록 */
app.post("/api/reports", upload.array("images", 5), async (req, res) => {
  try {
    const r = req.body;
    const result = await pool.query(
      `
      INSERT INTO reports (
        report_date, project_name, site_name, writer, weather, temp_c,
        work_process, work_content, manpower_direct, manpower_sub,
        equipment_note, material_note, material_issue, issues, plan_next
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id
      `,
      [
        r.report_date,
        r.project_name,
        r.site_name,
        r.writer,
        r.weather,
        r.temp_c,
        r.work_process ? r.work_process.split(",") : [],
        r.work_content,
        r.manpower_direct || 0,
        r.manpower_sub || 0,
        r.equipment_note,
        r.material_note,
        r.material_issue,
        r.issues,
        r.plan_next,
      ]
    );

    const reportId = result.rows[0].id;

    for (const f of req.files || []) {
      await pool.query(
        `INSERT INTO images (report_id, file_path, original_name)
         VALUES ($1,$2,$3)`,
        [reportId, `/uploads/${f.filename}`, f.originalname]
      );
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "저장 실패" });
  }
});

/* 관리자 목록 */
app.get("/api/reports", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM reports ORDER BY created_at DESC`
  );
  res.json(rows);
});

/* 관리자 상세 */
app.get("/api/reports/:id", async (req, res) => {
  const { id } = req.params;

  const report = await pool.query(
    `SELECT * FROM reports WHERE id=$1`,
    [id]
  );

  const images = await pool.query(
    `SELECT * FROM images WHERE report_id=$1`,
    [id]
  );

  res.json({
    report: report.rows[0],
    images: images.rows,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
