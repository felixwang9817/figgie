const express = require("express");
const app = express();
const port = 8080;
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname));
http.listen(port, () => console.log(`Example app listening on port ${port}!`));

var suits = ["hearts", "diamonds", "clubs", "spades"];


// state
state = {
  bids: {
    clubs: { bid: null, player: null },
    spades: { bid: null, player: null },
    hearts: { bid: null, player: null },
    diamonds: { bid: null, player: null }
  },
  offers: {
    clubs: { offer: null, player: null },
    spades: { offer: null, player: null },
    hearts: { offer: null, player: null },
    diamonds: { offer: null, player: null }
  }
};

io.on("connection", function(socket) {
  // on connection, server determines unique id for the socket and stores in a dictionary
  console.log("a user connected");
  socket.on("disconnect", function() {
    console.log("user disconnected");
  });
  
  // wait for client action
  socket.on("client_command", msg => {
    console.log("server has received command: " + msg);

    // parse
    let tokens = msg.split(" ");
    console.log(tokens);
    if (tokens.length == 3) {
      // offer command
      let suit = tokens[0];
      let price = Number(tokens[2]);
      if (!suits.includes(tokens[0]) || tokens[1] != "at" || isNaN(tokens[2])) {
        socket.emit("bad_command");
        return false;
      }
      // edit state here, then send new state to client for update
      // TODO: add verification such as the new bid is better than existing bid
      state["offers"][suit]["offer"] = price;
      // TODO: add player after settling unique id for socket
      // io.emit("market_update", JSON.stringify(state));
      console.log(state);
      io.emit("market_update", state);
    } else {
      // TODO: bid command
      return false;
    }

    // TODO: player states
  });
});
