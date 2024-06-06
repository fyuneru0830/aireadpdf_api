const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./tasks.db');

db.serialize(() => {
  db.each("SELECT * FROM converted_images", (err, row) => {
    if (err) {
      console.error(err.message);
    }
    console.log(row);
  });
});

db.close();