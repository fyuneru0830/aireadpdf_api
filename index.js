const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');

const uploadRoute = require('./routes/upload');
const convertRoute = require('./routes/convert_img');
const convertTxtRouter = require('./routes/convert_txt');
const resultRouter = require('./routes/result');
const exportRoute = require('./routes/export'); 

app.use(cors());

// 添加这行以解析 JSON 请求体
app.use(express.json());

app.use(express.urlencoded({ extended: true, type: 'application/x-www-form-urlencoded; charset=utf-8' })); // 変更: URLエンコードのエンコーディングを設定


app.use('/upload', uploadRoute);
app.use('/convert_img', convertRoute);
app.use('/convert_txt', convertTxtRouter);
app.use('/result', resultRouter);
app.use('/export', exportRoute); 

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});