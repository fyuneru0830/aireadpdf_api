//SQLite数据库操作
//ExcelJS生成Excel文件

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const ExcelJS = require('exceljs');
const router = express.Router();

router.get('/', (req, res) => {
  const taskId = req.query.id;
  if (!taskId) {
    return res.status(400).send('task_id is required');
  }

  const db = new sqlite3.Database('./tasks.db');

  db.all(`
    SELECT ci.*, t.origin_name, t.task_name 
    FROM converted_images ci
    JOIN tasks t ON ci.task_id = t.id
    WHERE ci.task_id = ?
  `, [taskId], (err, rows) => {
    if (err) {
      db.close();
      return res.status(500).send('Database error');
    }

    if (rows.length === 0) {
      db.close();
      return res.status(404).send('No data found');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Converted Images');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Task ID', key: 'task_id', width: 20 },
      { header: 'Image Name', key: 'image_name', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'API Response', key: 'api_response', width: 30 },
      { header: 'Tokens Used', key: 'tokens_used', width: 15 },
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'Origin Name', key: 'origin_name', width: 30 },
      { header: 'Task Name', key: 'task_name', width: 30 }
    ];

    rows.forEach(row => {
      worksheet.addRow(row);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=converted_images.xlsx');

    workbook.xlsx.write(res)
      .then(() => {
        res.end();
        db.close();
      })
      .catch(error => {
        res.status(500).send('Error generating Excel file');
        db.close();
      });
  });
});

module.exports = router;