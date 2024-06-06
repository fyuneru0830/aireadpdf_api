//用来接收上传的PDF文件
//然后将文件保存到uploads文件夹
//然后将文件名和文件夹名保存到数据库

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { ulid, decodeTime } = require('ulid');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const router = express.Router();
router.use(cors());

const db = new sqlite3.Database('./tasks.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the tasks database.');
});
db.run("PRAGMA encoding = 'UTF-8';"); // Added: Set database encoding to UTF-8

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    // ULIDを生成して新しいディレクトリを作成
    const ulidValue = ulid();
    const ulidDir = path.join(uploadDir, ulidValue);
    if (!fs.existsSync(ulidDir)) {
      fs.mkdirSync(ulidDir);
    }

    // ULIDディレクトリをリクエストオブジェクトに保存
    req.ulidDir = ulidDir;
    req.ulidValue = ulidValue;

    cb(null, ulidDir);
  },
  filename: (req, file, cb) => {
    // ファイル名をULIDと同じにする
    const ulidName = req.ulidValue;
    const uniqueName = `${ulidName}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

router.post('/', upload.single('pdf'), (req, res) => {
  const { file_name } = req.body; // 新しいパラメータを取得

  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const ulidName = req.ulidValue;
  const timestamp = decodeTime(ulidName);

  // データベースにタスクを記録
  db.run(
    `INSERT INTO tasks (id, origin_name, task_name, status, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [ulidName, file_name || req.file.originalname, ulidName, '已经保存PDF文件', new Date(timestamp).toISOString()],
    (err) => {
      if (err) {
        return res.status(500).send('Failed to record task in database.');
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8'); // ここでエンコーディングを設定
      const response = {
        message: 'File uploaded successfully',
        originalFileName: req.file.originalname,
        taskId: ulidName
      };
      res.send(response);
      console.log(`Response sent: ${response}`); // Added: Log response content
    }
  );
});

module.exports = router;