const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// 中介軟體來記錄每個請求的詳細資訊
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/submit', (req, res) => {
    const data = req.body;
    console.log('Received data:', data); // 確認接收到的資料
    // 輸出接收到的資料數值
    console.log(`Username: ${data.username}`);
    console.log(`Password: ${data.password}`);
    fs.writeFile('data.json', JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error saving data:', err);
            res.status(500).send('Error saving data');
        } else {
            console.log('Data saved successfully');
            res.send('Data saved successfully');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
