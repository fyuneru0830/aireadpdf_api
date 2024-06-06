// 这个接口用来将图片转换为文字
//利用了OpenAI的第三方代理的API

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const db = new sqlite3.Database('./tasks.db');

router.get('/', async (req, res) => {
  const taskId = req.query.id;

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
          res.write(`Reading file: ${imageName}\n`);
          const base64Image = fs.readFileSync(imagePath, 'base64');
          res.write(`File read successfully: ${imageName}\n`);

          res.write(`Sending API request for: ${imageName}\n`);
          console.log(`Starting to process image: ${imageName}`);
          const response = await axios.post('https://api2.aigcbest.top/v1/chat/completions', {
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: req.query.system_prompt || `あなたは文字入力のプロです。以下の形式でしか話せません。 
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
                  { type: 'text', text: req.query.user_prompt ||'文字を書き起こしてください' },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                ]
              }
            ],
            max_tokens: 300
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer sk-6HTrpakr7k0WngrG2492F498D6C240E7B547051c6540B142`
            }
          });

          res.write(`API request successful for: ${imageName}\n`);
          const apiResponse = response.data;
          console.log('API Response:', apiResponse);

          const messageContent = apiResponse.choices[0].message.content;
          const tokensUsed = apiResponse.usage ? {
            input: apiResponse.usage.prompt_tokens,
            output: apiResponse.usage.completion_tokens
          } : { input: 0, output: 0 };

          res.write(`Updating data in database for: ${imageName}\n`);
          db.run(`
            UPDATE converted_images
            SET status = ?, api_response = ?, tokens_used = ?
            WHERE task_id = ? AND image_name = ?
          `, ['completed', messageContent, JSON.stringify(tokensUsed), taskId, imageName], (err) => {
            if (err) {
              console.error('Error updating database', err);
              res.write(`Error updating database for: ${imageName}\n`);
            } else {
              res.write(`Data updated in database for: ${imageName}\n`);
            }
          });

          processedCount++;
          res.write(`Processed ${processedCount} of ${totalFiles} images\n`);

        } catch (error) {
          console.error('Error making API request', error);
          res.write(`Error processing image ${imageName}\n`);
        }
      }

      res.end('Conversion process completed');
    });
  });
});

module.exports = router;