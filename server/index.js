// OUR-NOTE/server/index.js
const express = require('express');
const app = express();
const port = 5000;

app.get('/', (req, res) => {
  res.send('Hello from Backend!');
});

app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});