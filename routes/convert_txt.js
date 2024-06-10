// 这个接口用来将图片转换为文字
//利用了OpenAI的第三方代理的API

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const db = new sqlite3.Database('./tasks.db');

// 添加这行以解析 JSON 请求体
router.use(express.json());

router.post('/', async (req, res) => {
  const taskId = req.body.id;

  console.log('Received request with body:', req.body);

  if (!taskId) {
    return res.status(400).send('Task ID is required');
  }

  db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
    if (err) {
      return res.status(500).send('Database error');
    }

    if (!task) {
      return res.status(404).send('Task not found');
    }

    const imgDir = path.join(__dirname, '..', 'uploads', taskId, 'img');
    fs.readdir(imgDir, async (err, files) => {
      if (err) {
        return res.status(500).send('Error reading image directory');
      }

      let processedCount = 0;
      const totalFiles = files.length;

      console.log(`Starting conversion process for ${totalFiles} images`);

      for (const file of files) {
        const imagePath = path.join(imgDir, file);
        const imageName = path.basename(file);

        try {
          console.log(`Reading file: ${imageName}`);
          const base64Image = fs.readFileSync(imagePath, 'base64');
          console.log(`File read successfully: ${imageName}`);

          console.log(`Sending API request for: ${imageName}`);
          const response = await axios.post('https://api2.aigcbest.top/v1/chat/completions', {
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: req.body.system_prompt || `あなたは文字入力のプロです。以下の形式でしか話せません。 
                --- ヘッダーなど本文以外の内容 ---
    
                --- メインコンテンツ ---
                # タイトル
                ## サブタイトル
                本文
            
                --- ページ番号 ---`
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: req.body.user_prompt ||'文字を書き起こしてください' },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                ]
              }
            ]
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer sk-6HTrpakr7k0WngrG2492F498D6C240E7B547051c6540B142`
            },
            timeout: 6000000 // 设置超时时间为60秒
          });
          //发送的请求打印到log
          console.log(`API request successful for: ${imageName}`);
          const apiResponse = response.data;
          console.log('API Response:', apiResponse);

          const messageContent = apiResponse.choices[0].message.content;
          const tokensUsed = apiResponse.usage ? {
            input: apiResponse.usage.prompt_tokens,
            output: apiResponse.usage.completion_tokens
          } : { input: 0, output: 0 };

          console.log(`Updating data in database for: ${imageName}`);
          db.run(`
            UPDATE converted_images
            SET status = ?, api_response = ?, tokens_used = ?
            WHERE task_id = ? AND image_name = ?
          `, ['completed', messageContent, JSON.stringify(tokensUsed), taskId, imageName], (err) => {
            if (err) {
              console.error('Error updating database', err);
            } else {
              console.log(`Data updated in database for: ${imageName}`);
            }
          });

          processedCount++;
          console.log(`Processed ${processedCount} of ${totalFiles} images`);

        } catch (error) {
          console.error('Error making API request', error);
        }
      }

      res.json({ message: 'Conversion process completed' });
    });
  });
});

module.exports = router;