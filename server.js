const express = require("express");
const app = express();
const port = 8080;
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname));
http.listen(port, () => console.log(`Example app listening on port ${port}!`));

var suits = ["hearts", "diamonds", "clubs", "spades"];
var actions = ["take", "sell"];

// state
var initialMarketState = {
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

var marketState = deepCopy(initialMarketState);

function parseCommand(command) {
  console.log("command: " + command);
  let tokens = command.split(" ");

  if (tokens.length == 2) {
    // take or sell command
    let action = tokens[0];
    let suit = tokens[1];
    if (!actions.includes(action) || !suits.includes(suit)) {
      return false;
    }

    console.log("take or sell command detected");
    if (action == "take") {
      takeOffer(suit);
    }
  }
  if (tokens.length == 3) {
    // offer command
    let suit = tokens[0];
    let price = Number(tokens[2]);
    if (!suits.includes(suit) || tokens[1] != "at" || isNaN(price)) {
      return false;
    }

    console.log("offer command detected");
    postOffer(suit, price);
  }
}

function takeOffer(suit) {
  let currentOffer = marketState["offers"][suit]["offer"];
  let seller = marketState["offers"][suit]["player"];

  // execute trade on market and player data
  // TODO: move player data from App.js to server.js and handle player execution later

  // TODO: clear market at end
  clearMarket();
}

function clearMarket() {
  marketState = deepCopy(initialMarketState);
  console.log("clearMarket: " + JSON.stringify(marketState));
  io.emit("market_update", marketState);
}

function postOffer(suit, price, player = 0) {
  let currentOffer = marketState["offers"][suit]["offer"];
  console.log("currentOffer: " + currentOffer);
  console.log("price: " + price);
  if (price > currentOffer) {
    marketState["offers"][suit]["offer"] = price;
    marketState["offers"][suit]["player"] = player;
    io.emit("market_update", marketState);
    console.log("final marketState after postOffer: " + marketState);
  }
}

function deepCopy(x) {
  return JSON.parse(JSON.stringify(x));
}

io.on("connection", function(socket) {
  // on connection, server determines unique id for the socket and stores in a dictionary
  console.log("a user connected");
  socket.on("disconnect", function() {
    console.log("user disconnected");
  });

  // wait for client action
  socket.on("client_command", command => {
    console.log("server has received command: " + command);
    parseCommand(command);
  });
});
