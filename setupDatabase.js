const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./tasks.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the tasks database.');
});
db.run("PRAGMA encoding = 'UTF-8';"); // 追加: データベースのエンコーディングを設定

db.serialize(() => {
  // tasksテーブルの作成
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      origin_name TEXT NOT NULL,
      task_name TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);

  // converted_imagesテーブルの作成
  db.run(`
    CREATE TABLE IF NOT EXISTS converted_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT,
      image_name TEXT,
      status TEXT,
      api_response TEXT,
      tokens_used INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    )
  `);
});

db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Closed the database connection.');
});