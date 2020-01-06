const express = require("express");
const app = express();
const port = 8080;
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname));

// app.get('/', (req, res) => res.send('Hello World!'))

http.listen(port, () => console.log(`Example app listening on port ${port}!`));

app.get("/sum/:num1/:num2", function(req, res) {
  const sum = Number(req.params.num1) + Number(req.params.num2);
  res.send("ans: " + sum);
});

var number = 5;

app.get("/test", function(req, res) {
  res.send(String(number));
});

app.get("/change_test", function(req, res) {
  number += 10;
  io.emit("test", "random"); // try socket.emit later
  // socket connections seem to be working correctly thanks to server logs
  // however, either this io.emit signal is not being sent correctly, or it is not reaching
  // the client properly
  // emit server event
});

io.on("connection", function(socket) {
  console.log("a user connected");
  socket.on("disconnect", function() {
    console.log("user disconnected");
  });
});
