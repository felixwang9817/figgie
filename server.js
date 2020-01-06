const express = require('express');
const app = express();
const port = 8080;

app.use(express.static(__dirname));

// app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

app.get("/sum/:num1/:num2", function(req, res) {
  const sum = Number(req.params.num1) + Number(req.params.num2);
  res.send("ans: " + sum);
});