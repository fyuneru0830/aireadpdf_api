//会response任务的结果

const express = require('express');
const sqlite3 = require('sqlite3');
const router = express.Router();

router.get('/', (req, res) => {
  const db = new sqlite3.Database('./tasks.db', (err) => {
    if (err) {
      console.error('Database connection error:', err.message);
      res.status(500).json({ message: 'Database connection error' });
      return;
    }
    //console.log('Connected to the SQLite database!');
  });

  const id = req.query.id;
  //console.log(`Received id: ${id}`); // 追加: idのログを出力

  const query = `SELECT api_response, status, tokens_used, image_name FROM converted_images WHERE task_id = ?`;
  //console.log(`Executing query: ${query} with id: ${id}`); // クエリとidをログに出力
  db.all(query, [id], (err, rows) => {
    if (err) {
      console.error('Database query error:', err.message);
      res.status(500).json({ message: 'Database error' });
      return;
    }
    //console.log('Query result:', rows); // クエリ結果をログに出力
    if (rows.length > 0) {
      const responses = rows.map(row => ({
        api_response: row.api_response,
        status: row.status,
        tokens_used: row.tokens_used,
        image_name: row.image_name
      }));
      res.json(responses);
    } else {
      // converted_imagesテーブルにレコードが見つからない場合、tasksテーブルを検索
      const taskQuery = `SELECT status FROM tasks WHERE id = ?`;
      console.log(`Executing task query: ${taskQuery} with id: ${id}`); // クエリとidをログに出力
      db.get(taskQuery, [id], (err, row) => {
        if (err) {
          console.error('Database query error:', err.message);
          res.status(500).json({ message: 'Database error' });
          return;
        }
        console.log('Task query result:', row); // クエリ結果をログに出力
        if (row) {
          res.json({ status: row.status });
        } else {
          res.status(404).json({ message: 'No record found' });
        }
      });
    }
  });
  db.close();
});

module.exports = router;