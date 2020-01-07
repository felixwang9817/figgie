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
var initSuitMarket = {
  bid: null,
  bid_player: null,
  offer: null,
  offer_player: null
};

var initialMarketState = {
  clubs: { ...initSuitMarket },
  spades: { ...initSuitMarket },
  hearts: { ...initSuitMarket },
  diamonds: { ...initSuitMarket }
};

var marketState = deepCopy(initialMarketState);

var initialPlayerState = {
  diamonds: 1,
  clubs: 2,
  hearts: 3,
  spades: 4,
  num_cards: 10,
  money: 50
};

var playerState = {};

var tradeLog = ["test", "asdf"];

function parseCommand(command, socket_id) {
  command = command.toLowerCase();
  console.log("command: " + command);
  let tokens = command.split(" ");
  let username = socketMap[socket_id];

  if (tokens.length == 2) {
    // take or sell command
    let action = tokens[0];
    let suit = tokens[1];
    if (!actions.includes(action) || !suits.includes(suit)) {
      return false;
    }

    console.log("take or sell command detected");
    if (action == "take") {
      takeOffer(suit, username);
    } else {  // sell
      sellBid(suit, username);
    }
  } else if (tokens.length == 3) {
    // offer command
    let suit = tokens[0];
    let price = Number(tokens[2]);
    if (!suits.includes(suit) || tokens[1] != "at" || isNaN(price)) {
      return false;
    }

    console.log("offer command detected");
    postOffer(suit, price, username);
  }
}


// assumes trade is valid!
function tradeCard(buyer, seller, suit, price) {
  let sellerState = playerState[seller];
  let buyerState = playerState[buyer];

  sellerState[suit] -= 1;
  buyerState[suit] += 1;
  sellerState["num_cards"] -= 1;
  buyerState["num_cards"] += 1;
  sellerState["money"] += price;
  buyerState["money"] -= price;
}



function takeOffer(suit, username) {
  let price = marketState[suit]["offer"];
  if (price === null) return;
  let seller = marketState[suit]["offer_player"];
  if (seller == username) return;  // can't self trade


  tradeCard(username, seller, suit, price);
  clearMarket();
  updatePlayers();
}


function sellBid(suit, username) {
  let price = marketState[suit]["bid"];
  if (price === null) return;
  let buyer = marketState[suit]["bid_player"];
  if (buyer == username) return;  // can't self trade
  let userState = playerState[username];
  if (userState[suit] < 1) return; // check have card to sell

  tradeCard(buyer, username, suit, price);
  clearMarket();
  updatePlayers();
}

function clearMarket() {
  marketState = deepCopy(initialMarketState);
  console.log("clearMarket: " + JSON.stringify(marketState));
  io.emit("market_update", marketState);
}

function postOffer(suit, price, player) {
  let sellerState = playerState[player];
  if (sellerState[suit] < 1) return;  // check have card to sell

  let currentOffer = marketState[suit]["offer"];
  console.log("currentOffer: " + currentOffer);
  console.log("price: " + price);
  if (currentOffer === null || price > currentOffer) {
    marketState[suit]["offer"] = price;
    marketState[suit]["offer_player"] = player;
    io.emit("market_update", marketState);
    console.log(
      "final marketState after postOffer: " + JSON.stringify(marketState)
    );
  }
}

function deepCopy(x) {
  return JSON.parse(JSON.stringify(x));
}

// socket.id to unique username
var usernames = ["alice", "bob", "charlie", "zeus"];
socketMap = {};

function updatePlayers() {
  // for each socket in socketMap, shield appropriately and socket.emit to that socket
  for (const socketid in socketMap) {
    // TODO: shield
    io.to(socketid).emit("player_update", playerState);
  }
}

io.on("connection", function(socket) {
  // TODO: reject connections when there are already four

  // on connection, server determines unique id for the socket and stores in a dictionary
  console.log("socket id: " + socket.id);
  let username = usernames.pop();
  socketMap[socket.id] = username;
  console.log("socketMap: " + JSON.stringify(socketMap));

  // add player to playerstate
  playerState[username] = deepCopy(initialPlayerState);
  updatePlayers();
  io.emit("market_update", marketState); // TODO: make this a helper function
  io.emit("trade_log_update", tradeLog);

  // on connection, server determines unique id for the socket and stores in a dictionary
  console.log("a user connected");

  socket.on("disconnect", function() {
    console.log("user disconnected");
    usernames.push(socketMap[socket.id]);
    delete socketMap[socket.id];
  });

  // wait for client action
  socket.on("client_command", command => {
    console.log("server has received command: " + command);
    parseCommand(command, socket.id);
  });
});
