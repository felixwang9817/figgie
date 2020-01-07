const express = require("express");
const app = express();
const port = 8080;
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname));
http.listen(port, () => console.log(`Example app listening on port ${port}!`));

let suits = ["hearts", "diamonds", "clubs", "spades"];
let actions = ["take", "sell"];
let clearActions = ["clear", "out"];
let goalSuit = null;
let isGameActive = false;

// market state
let initSuitMarket = {
  bid: null,
  bidPlayer: null,
  offer: null,
  offerPlayer: null
};
let initialMarketState = {
  clubs: { ...initSuitMarket },
  spades: { ...initSuitMarket },
  hearts: { ...initSuitMarket },
  diamonds: { ...initSuitMarket }
};
let marketState = deepCopy(initialMarketState);

// player state
let initialPlayerState = {
  diamonds: null,
  clubs: null,
  hearts: null,
  spades: null,
  numCards: 10,
  money: 300
};
let playerState = {}; // username -> playerDataDict

// trade log
let tradeLog = [];

function parseCommand(command, socketId) {
  if (!isGameActive) {
    if (command == "start") {
      startGame();
    } else { 
      console.log("game is not active, so not parsing command");
    }
    return;
  }

  if (command == "end") {
    endGame();
    return;
  }

  let tokens = command.toLowerCase().split(" ");
  let username = socketMap[socketId];

  if (tokens.length == 1) {
    // clear command: clear or out
    let clearAction = tokens[0];
    if (!clearActions.includes(clearAction)) {
      return false;
    }

    console.log("clear or out command detected");
    clearPlayer(username);
  } else if (tokens.length == 2) {
    // take command: take SUIT
    // sell command: sell SUIT
    let action = tokens[0];
    let suit = tokens[1];
    if (!actions.includes(action) || !suits.includes(suit)) {
      return false;
    }

    console.log("take or sell command detected");
    if (action == "take") {
      takeOffer(suit, username);
    } else {
      sellBid(suit, username);
    }
  } else if (tokens.length == 3) {
    // offer command: SUIT at X
    let suit = tokens[0];
    let price = Number(tokens[2]);
    if (!suits.includes(suit) || tokens[1] != "at" || isNaN(price)) {
      return false;
    }

    console.log("offer command detected");
    postOffer(suit, price, username);
  } else if (tokens.length == 4) {
    // bid command: X bid for SUIT
    let suit = tokens[3];
    let price = Number(tokens[0]);
    if (
      !suits.includes(suit) ||
      tokens[1] != "bid" ||
      tokens[2] != "for" ||
      isNaN(price)
    ) {
      return false;
    }

    console.log("bid command detected");
    postBid(suit, price, username);
  }
}

// assumes trade is valid!
function tradeCard(buyer, seller, suit, price) {
  let sellerState = playerState[seller];
  let buyerState = playerState[buyer];

  sellerState[suit] -= 1;
  buyerState[suit] += 1;
  sellerState["numCards"] -= 1;
  buyerState["numCards"] += 1;
  sellerState["money"] += price;
  buyerState["money"] -= price;

  let trade = `${buyer} bought ${suit} from ${seller} for ${price}`;
  tradeLog.unshift(trade);
  io.emit("tradeLogUpdate", tradeLog);

  clearMarket();
  updatePlayers();
}

function postOffer(suit, price, player) {
  let sellerState = playerState[player];
  if (sellerState[suit] < 1) return; // check have card to sell

  let currentOffer = marketState[suit]["offer"];
  console.log("currentOffer: " + currentOffer);
  console.log("price: " + price);
  if (currentOffer === null || price < currentOffer) {
    // valid offer; check market crossing
    let bidPrice = marketState[suit]["bid"];
    let bidPlayer = marketState[suit]["bidPlayer"];
    console.log("bidPrice: " + bidPrice);
    console.log("bidPlayer: " + bidPlayer);
    if (bidPrice !== null && bidPrice >= price) {
      // crossed market
      if (bidPlayer != player) {
        // if it's yourself, it's allowed
        // otherwise, execute a trade at last bid price
        tradeCard(bidPlayer, player, suit, bidPrice);
        return; // market already updated and cleared
      }
    }

    // no market crossing or self-crossing: update new offer
    marketState[suit]["offer"] = price;
    marketState[suit]["offerPlayer"] = player;
    broadcastMarketUpdate();
  }
}

function postBid(suit, price, player) {
  let currentBid = marketState[suit]["bid"];
  console.log("currentBid: " + currentBid);
  console.log("price: " + price);
  if (currentBid === null || price > currentBid) {
    // valid bid; check market crossing
    let offerPrice = marketState[suit]["offer"];
    let offerPlayer = marketState[suit]["offerPlayer"];
    if (offerPrice !== null && offerPrice <= price) {
      // crossed market
      if (offerPlayer != player) {
        // if it's yourself, it's allowed
        // otherwise, execute a trade at last offer price
        tradeCard(player, offerPlayer, suit, offerPrice);
        return; // market already updated and cleared
      }
    }

    // no market crossing or self-crossing: update new bid
    marketState[suit]["bid"] = price;
    marketState[suit]["bidPlayer"] = player;
    broadcastMarketUpdate();
  }
}

function takeOffer(suit, username) {
  let price = marketState[suit]["offer"];
  if (price === null) return;
  let seller = marketState[suit]["offerPlayer"];
  if (seller == username) return; // can't self trade

  tradeCard(username, seller, suit, price);
}

function sellBid(suit, username) {
  let price = marketState[suit]["bid"];
  if (price === null) return;
  let buyer = marketState[suit]["bidPlayer"];
  if (buyer == username) return; // can't self trade
  let userState = playerState[username];
  if (userState[suit] < 1) return; // check have card to sell

  tradeCard(buyer, username, suit, price);
}

function clearMarket() {
  marketState = deepCopy(initialMarketState);
  console.log("clearMarket: " + JSON.stringify(marketState));
  broadcastMarketUpdate();
}

function clearPlayer(username) {
  suits.forEach(suit => {
    let suitMarketState = marketState[suit];
    if (suitMarketState["bidPlayer"] == username) {
      suitMarketState["bidPlayer"] = null;
      suitMarketState["bid"] = null;
    }
    if (suitMarketState["offerPlayer"] == username) {
      suitMarketState["offerPlayer"] = null;
      suitMarketState["offer"] = null;
    }
    broadcastMarketUpdate();
  });
}

function deepCopy(x) {
  return JSON.parse(JSON.stringify(x));
}

// socket.id to unique username
let usernames = ["alice", "bob", "charlie", "zeus"];
socketMap = {};

function shieldPlayerInfo(socketid) {
  let playerVisibleState = deepCopy(playerState);
  let username = socketMap[socketid];

  // hiding other player's hands
  Object.keys(playerState).map(player => {
    if (player != username) {
      suits.forEach(suit => {
        playerVisibleState[player][suit] = null;
      });
    }
  });

  return playerVisibleState;
}

function updatePlayers() {
  // for each socket in socketMap, shield appropriately and socket.emit to that socket
  for (const socketid in socketMap) {
    io.to(socketid).emit("playerUpdate", shieldPlayerInfo(socketid));
  }
}

function broadcastMarketUpdate() {
  io.emit("marketUpdate", marketState);
}

io.on("connection", function(socket) {
  // TODO: reject connections when there are already four
  if (Object.keys(socketMap).length == 4) {
    socket.emit("fullRoom");
    console.log("Full room, rejecting connection from " + socket.id);
    socket.disconnect();
    return;
  }


  // on connection, server assigns username to the unique socket id of the client
  console.log("a user connected");
  let username = usernames.pop();
  socketMap[socket.id] = username;

  // on connection, initialize the new player
  playerState[username] = deepCopy(initialPlayerState);
  updatePlayers();
  broadcastMarketUpdate();
  io.emit("tradeLogUpdate", tradeLog);
  socket.emit("username", username);

  // on disconnection, server recycles the client username
  socket.on("disconnect", function() {
    console.log("user disconnected");
    let username = socketMap[socket.id];
    usernames.push(username);
    delete playerState[username];
    delete socketMap[socket.id];
    updatePlayers();
  });

  // on client command, server parses the command
  socket.on("clientCommand", command => {
    console.log("server has received command: " + command);
    parseCommand(command, socket.id);
  });

  socket.on("startGame", startGame);
  socket.on("endGame", endGame);
});

function otherColor(suit) {
  return {
    spades: "clubs",
    clubs: "spades",
    diamonds: "hearts",
    hearts: "diamonds"
  }[suit];
}

function randomSuit() {
  return suits[Math.floor(Math.random() * suits.length)];
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}


function updateGameState(state) {
  isGameActive = state;
  io.emit("gameStateUpdate", state);
}


// init game stuff
function startGame() {
  if (Object.keys(socketMap).length !== 4 || isGameActive) {
    return;
  }

  console.log("game starting..." + JSON.stringify(socketMap));

  let common = randomSuit();
  let goal = otherColor(common);
  let eight = randomSuit();
  while (eight == common) eight = randomSuit();

  let remainingSuits = suits.filter(s => s != common && s != eight);

  let cards = Array(40);
  cards.fill(common, 0, 12);
  cards.fill(eight, 12, 20);
  cards.fill(remainingSuits[0], 20, 30);
  cards.fill(remainingSuits[1], 30, 40);

  console.log("preshuffle: " + cards);
  shuffle(cards);

  console.log("goal: " + goal);
  console.log("cards: " + cards);
  goalSuit = goal;

  // distribute cards to players
  let cnt = 0;
  Object.keys(playerState).map(player => {
    let playerCards = cards.slice(cnt, cnt + 10);
    playerState[player]["money"] -= 50;

    suits.forEach(suit => {
      playerState[player][suit] = 0;
    });
    playerCards.forEach(card => {
      playerState[player][card] += 1;
    });
    cnt += 10;
  });
  updatePlayers();
  updateGameState(true);
}

function endGame() {
  if (!isGameActive) return;

  updateGameState(false);

  // compute final rewards and emit to all clients for display
  let winners = [];
  let maxGoalSuit = 0;
  let numGoalSuitTotal = 0;
  let rewards = {};
  Object.keys(playerState).map(player => {
    let numGoalSuit = playerState[player][goalSuit];
    numGoalSuitTotal += numGoalSuit;
    rewards[player] = numGoalSuit * 10;
    if (numGoalSuit > maxGoalSuit) {
      winners = [player];
      maxGoalSuit = numGoalSuit;
    } else if (numGoalSuit == maxGoalSuit) {
      winners.push(player);
    }
  });
  winners.forEach(winner => {
    rewards[winner] += (200 - numGoalSuitTotal * 10) / winners.length;
  });

  let msg = "goal: " + goalSuit + ", rewards: " + JSON.stringify(rewards, null, 1);

  tradeLog.unshift(msg);
  tradeLog.unshift("----");
  io.emit("tradeLogUpdate", tradeLog);

  // give out rewards
  Object.keys(playerState).map(player => {
    playerState[player]["money"] += rewards[player];
  });
  updatePlayers();
}
