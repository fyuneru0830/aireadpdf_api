const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { pdf } = require('pdf-to-img');
const sqlite3 = require('sqlite3').verbose();

const router = express.Router();
const db = new sqlite3.Database('./tasks.db');

router.get('/', async (req, res) => {
  const taskId = req.query.id;

  if (!taskId) {
    return res.status(400).send('ID is required');
  }

  db.get(`SELECT * FROM tasks WHERE id = ? AND status = '已经保存PDF文件'`, [taskId], async (err, task) => {
    if (err) {
      return res.status(500).send('Failed to retrieve task from database.');
    }

    if (!task) {
      return res.status(404).send('Task not found or already processed.');
    }

    const pdfPath = path.join(__dirname, '../uploads', task.task_name, `${task.task_name}.pdf`);
    const outputDir = path.join(__dirname, '../uploads', task.task_name, 'img');

    try {
      await fs.mkdir(outputDir, { recursive: true });

      const document = await pdf(pdfPath, { scale: 2.0 });

      let counter = 1;
      for await (const image of document) {
        const imageName = `${task.task_name}-${counter}.png`;
        const imgPath = path.join(outputDir, imageName);
        await fs.writeFile(imgPath, image);

        // 変換された画像の情報を新しいテーブルに挿入
        db.run(`INSERT INTO converted_images (task_id, image_name, status, api_response, tokens_used) VALUES (?, ?, ?, ?, ?)`, 
          [taskId, imageName, 'pending', '', 0], (err) => {
          if (err) {
            console.error('Failed to insert image info into database:', err);
          }
        });

        counter++;
      }

      console.log('Successfully converted PDF to images');
      db.run(`UPDATE tasks SET status = '已转换为图片' WHERE id = ?`, [taskId], (err) => {
        if (err) {
          return res.status(500).send('Failed to update task status in database.');
        }
        res.send('PDF successfully converted to images.');
      });
    } catch (err) {
      console.error('Error converting PDF to images:', err);
      res.status(500).send('Failed to convert PDF to images.');
    }
  });
});

module.exports = router;