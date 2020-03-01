const express = require("express");
const app = express();
const cors = require('cors');
app.use(cors());  // enable cross-origin access all
const port = 8080;
const http = require("http").createServer(app);
const io = require("socket.io")(http);
// io.set('origins', '*:*');
const utils = require("./utils");
const db = require("./queries");
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const path = require("path");
require("isomorphic-fetch");

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));


// Postgres db endpoints
app.get("/players", db.getPlayers);
app.get("/players/:username", db.getMoneyByUsername);
app.post("/players/:username", db.createPlayer);
app.put("/players/:username/:money", db.updatePlayer);
app.delete("/players/:username", db.deletePlayer);

passport.use(new Strategy(
  function(username, password, cb) {
    console.log("passport authenticate: username", username, "password", password);
    db.findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      if (/*user.password*/ "wow" != password) { return cb(null, false); }
      return cb(null, user);
    });
}));

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(user, cb) {
  cb(null, user);
});

app.use(passport.initialize());
app.use(passport.session());


app.post("/login", 
  passport.authenticate('local', { failureRedirect: '/'}),
  function(req, res) {
    console.log("router successful login post; user: ", req.user);
    res.send(req.user);
  });
         // function (req, res) {

  // console.log(req.body);
  // console.log(res.body);
  // let username = req.body.username;
  // let password = req.body.password;

  // // TODO: authenticate

  // console.log("login request received on server");

  // res.send(JSON.stringify({
  //   username: username,
  //   message: 'Successful'
  // }));
// });


// TODO: how to send a failure msg in json format when login fails? right now
// res.json() will just fail on the response when there's an http error e.g. 404
app.get('/auth', require('connect-ensure-login').ensureLoggedIn(),
  function(req, res) {
    console.log('router at /auth, user: ', req.user);
    res.send(req.user);
  });

// TODO: what triggers this fetch?
app.get('/logout',
  function(req, res){
    req.logout();
  });

app.get('/login',
  function(req, res) {
    res.redirect('/');  // placeholder, should just return nothing
  }
)


console.log('env:', process.env.NODE_ENV);
// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.join(__dirname, "/build")));
//   app.get("/*", function(req, res) {
//     res.sendFile(path.join(__dirname, "build", "index.html"));
//   });
// } else {
app.use(express.static(path.join(__dirname, "public")));
// }

http.listen(port, () => console.log(`Example app listening on port ${port}!`));



let server = "http://localhost:8080";

let maxUsers = 40; // TODO: stress test
let suits = ["hearts", "diamonds", "clubs", "spades", "h", "d", "c", "s"];
let suitAbbreviationToSuit = {
  h: "hearts",
  d: "diamonds",
  c: "clubs",
  s: "spades",
  hearts: "hearts",
  diamonds: "diamonds",
  clubs: "clubs",
  spades: "spades"
};
let actions = ["take", "sell", "t", "s"];
let clearActions = ["clear", "out", "c", "o"];

// state
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
let initialPlayerState = {
  diamonds: null,
  clubs: null,
  hearts: null,
  spades: null,
  numCards: 10,
  money: 300
};
let roomToState = {}; // room number -> market state and player state for that room

// socket and room info
socketidToUsername = {};
socketidToRoomNumber = {};
usernameToRoomNumber = {};

// PARSE FUNCTION
function parseCommand(command, socket) {
  let socketid = socket.id;
  let roomNumber = socketidToRoomNumber[socketid];
  if (!roomToState[roomNumber]) return;
  if (!roomToState[roomNumber]["isGameActive"]) {
    if (command == "start") {
      // TODO: check if there are four players
      startGame(roomNumber, socket);
    } else {
      socket.emit("alert", "Game is not active! Enter <start> to start.");
    }
    return;
  }

  if (command == "end") {
    endGame(roomNumber, socket);
    return;
  }

  let tokens = command.toLowerCase().split(" ");
  let username = socketidToUsername[socketid];

  if (tokens.length == 1) {
    // clear command: clear or out
    let clearAction = tokens[0];
    if (!clearActions.includes(clearAction)) {
      socket.emit("alert", "Command not found: " + command);
      return;
    }

    console.log("clear or out command detected");
    clearPlayer(username, roomNumber);
  } else if (tokens.length == 2) {
    // take command: take SUIT
    // sell command: sell SUIT
    let action = tokens[0];
    let suit = tokens[1];
    if (!actions.includes(action)) {
      socket.emit("alert", "Command not found: " + command);
      return;
    } else if (!suits.includes(suit)) {
      socket.emit("alert", "Error parsing suit: " + suit);
      return;
    }

    suit = suitAbbreviationToSuit[suit];
    console.log("take or sell command detected");
    if (action == "take" || action == "t") {
      takeOffer(suit, username, roomNumber, socket);
    } else {
      sellBid(suit, username, roomNumber, socket);
    }
  } else if (tokens.length == 3) {
    // offer command: SUIT at X
    let suit = tokens[0];
    let price = Number(tokens[2]);
    if (
      !suits.includes(suit) ||
      (tokens[1] != "at" && tokens[1] != "a") ||
      isNaN(price)
    ) {
      socket.emit("alert", "Command not found: " + command);
      return;
    }

    suit = suitAbbreviationToSuit[suit];
    console.log("offer command detected");
    if (!postOffer(suit, price, username, roomNumber)) {
      socket.emit("alert", "Invalid offer: no card to sell or price too high.");
    }
  } else if (tokens.length == 4) {
    // bid command: X bid for SUIT
    let suit = tokens[3];
    let price = Number(tokens[0]);
    if (
      !suits.includes(suit) ||
      (tokens[1] != "bid" && tokens[1] != "b") ||
      (tokens[2] != "for" && tokens[2] != "f") ||
      isNaN(price)
    ) {
      socket.emit("alert", "Command not found: " + command);
      return;
    }

    suit = suitAbbreviationToSuit[suit];
    console.log("bid command detected");
    if (!postBid(suit, price, username, roomNumber)) {
      socket.emit("alert", "Invalid bid: price too low.");
    }
  } else if (tokens.length == 7) {
    // cheat code: wanqi and felix are awesome username suit
    // allows user to purchase to purchase suit from username for price 1, if user has suit
    if (
      tokens[0] != "wanqi" ||
      tokens[1] != "and" ||
      tokens[2] != "felix" ||
      tokens[3] != "are" ||
      tokens[4] != "awesome" ||
      !Object.keys(roomToState[roomNumber]["playerState"]).includes(
        tokens[5]
      ) ||
      !suits.includes(tokens[6])
    ) {
      return;
    }

    let suit = suitAbbreviationToSuit[tokens[6]];
    let seller = tokens[5];
    postOffer(suit, 1, seller, roomNumber);
    takeOffer(suit, username, roomNumber, socket);
  }
}

// TRADING AND MARKET FUNCTIONS
function tradeCard(buyer, seller, suit, price, roomNumber) {
  // assumes trade is valid!
  let playerState = roomToState[roomNumber]["playerState"];
  let sellerState = playerState[seller];
  let buyerState = playerState[buyer];

  sellerState[suit] -= 1;
  buyerState[suit] += 1;
  sellerState["numCards"] -= 1;
  buyerState["numCards"] += 1;
  sellerState["money"] += price;
  buyerState["money"] -= price;

  let trade = `${buyer} bought ${suit} from ${seller} for ${price}`;
  let tradeLog = roomToState[roomNumber]["tradeLog"];
  tradeLog.unshift(trade);
  io.to(roomNumber).emit("tradeLogUpdate", tradeLog);
  io.to(roomNumber).emit("alert", "Trade! Market cleared.");

  clearMarket(roomNumber);
  updatePlayers(roomNumber);
}

function postOffer(suit, price, player, roomNumber) {
  let playerState = roomToState[roomNumber]["playerState"];
  let marketState = roomToState[roomNumber]["marketState"];
  let sellerState = playerState[player];
  if (!sellerState || !marketState || !playerState) return; // check nulls
  if (sellerState[suit] < 1) return false; // check have card to sell

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
        tradeCard(bidPlayer, player, suit, bidPrice, roomNumber);
        return true; // market already updated and cleared
      }
    }

    // no market crossing or self-crossing: update new offer
    marketState[suit]["offer"] = price;
    marketState[suit]["offerPlayer"] = player;
    broadcastMarketUpdate(roomNumber);
    return true;
  }
  return false;
}

function postBid(suit, price, player, roomNumber) {
  let marketState = roomToState[roomNumber]["marketState"];
  if (!marketState) return;
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
        tradeCard(player, offerPlayer, suit, offerPrice, roomNumber);
        return true; // market already updated and cleared
      }
    }

    // no market crossing or self-crossing: update new bid
    marketState[suit]["bid"] = price;
    marketState[suit]["bidPlayer"] = player;
    broadcastMarketUpdate(roomNumber);
    return true;
  }
  return false;
}

function takeOffer(suit, username, roomNumber, socket) {
  let marketState = roomToState[roomNumber]["marketState"];
  if (!marketState) return;
  let price = marketState[suit]["offer"];
  if (price === null) return socket.emit("alert", "No offer to take!");
  let seller = marketState[suit]["offerPlayer"];
  if (seller == username) return socket.emit("alert", "Can't self trade.");

  tradeCard(username, seller, suit, price, roomNumber);
}

function sellBid(suit, username, roomNumber, socket) {
  let marketState = roomToState[roomNumber]["marketState"];
  let playerState = roomToState[roomNumber]["playerState"];
  if (!marketState || !playerState) return;
  let price = marketState[suit]["bid"];
  if (price === null) return socket.emit("alert", "No bid to sell to!");
  let buyer = marketState[suit]["bidPlayer"];
  if (buyer == username) return socket.emit("alert", "Can't self trade");
  let userState = playerState[username];
  if (userState[suit] < 1) return socket.emit("alert", "No card to sell.");

  tradeCard(buyer, username, suit, price, roomNumber);
}

function clearMarket(roomNumber) {
  roomToState[roomNumber]["marketState"] = utils.deepCopy(initialMarketState);
  broadcastMarketUpdate(roomNumber);
}

function clearPlayer(username, roomNumber) {
  suits.forEach(suit => {
    let suitMarketState = roomToState[roomNumber]["marketState"][suit];
    if (suitMarketState && suitMarketState["bidPlayer"] == username) {
      suitMarketState["bidPlayer"] = null;
      suitMarketState["bid"] = null;
    }
    if (suitMarketState && suitMarketState["offerPlayer"] == username) {
      suitMarketState["offerPlayer"] = null;
      suitMarketState["offer"] = null;
    }
    broadcastMarketUpdate(roomNumber);
  });
}

// UPDATE FUNCTIONS
function shieldPlayerInfo(socketid, roomNumber) {
  let playerVisibleState = utils.deepCopy(
    roomToState[roomNumber]["playerState"]
  );
  let username = socketidToUsername[socketid];

  // hiding other player's hands
  Object.keys(playerVisibleState).map(player => {
    if (player != username) {
      suits.forEach(suit => {
        playerVisibleState[player][suit] = null;
      });
    }
  });

  return playerVisibleState;
}

function updatePlayers(roomNumber, shield = true) {
  // first, get socketids associated with roomNumber
  let socketids = io.sockets.adapter.rooms[roomNumber].sockets;
  console.log("socketids: " + JSON.stringify(socketids));

  // for each socket in socketidToUsername, shield appropriately and socket.emit to that socket
  for (const socketid in socketids) {
    if (shield) {
      io.to(socketid).emit(
        "playerUpdate",
        shieldPlayerInfo(socketid, roomNumber)
      );
    } else {
      io.to(socketid).emit(
        "playerUpdate",
        roomToState[roomNumber]["playerState"]
      );
    }
  }
}

function broadcastMarketUpdate(roomNumber) {
  let marketState = roomToState[roomNumber]["marketState"];
  io.to(roomNumber).emit("marketUpdate", marketState);
}

function updateGameState(state, roomNumber) {
  roomToState[roomNumber]["isGameActive"] = state;
  io.to(roomNumber).emit("gameStateUpdate", state);
}

// START AND END FUNCTIONS
function initializeRoom(roomNumber) {
  roomToState[roomNumber] = {};
  roomToState[roomNumber]["marketState"] = utils.deepCopy(initialMarketState);
  roomToState[roomNumber]["playerState"] = {};
  roomToState[roomNumber]["goalSuit"] = null;
  roomToState[roomNumber]["isGameActive"] = false;
  roomToState[roomNumber]["tradeLog"] = [];
}

function startGame(roomNumber, socket) {
  if (Object.keys(roomToState[roomNumber]["playerState"]).length !== 4) {
    return socket.emit("alert", "Not enough players!");
  } else if (roomToState[roomNumber]["isGameActive"]) {
    return socket.emit("alert", "Game already started!");
  }

  console.log("game started by player " + JSON.stringify(socketidToUsername));

  let common = utils.randomSuit();
  let goal = utils.otherColor(common);
  let eight = utils.randomSuit();
  while (eight == common) eight = utils.randomSuit();

  let remainingSuits = suits.filter(s => s != common && s != eight);

  let cards = Array(40);
  cards.fill(common, 0, 12);
  cards.fill(eight, 12, 20);
  cards.fill(remainingSuits[0], 20, 30);
  cards.fill(remainingSuits[1], 30, 40);

  console.log("preshuffle: " + cards);
  utils.shuffle(cards);

  console.log("goal: " + goal);
  console.log("cards: " + cards);
  roomToState[roomNumber]["goalSuit"] = goal;

  // distribute cards to players
  let cnt = 0;
  let playerState = roomToState[roomNumber]["playerState"];
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
  clearMarket(roomNumber);
  updatePlayers(roomNumber);
  updateGameState(true, roomNumber);
  io.to(roomNumber).emit("goalSuit", "");
  io.to(roomNumber).emit("alert", "Game on!"); // tell all players
}

function endGame(roomNumber, socket) {
  let playerState = roomToState[roomNumber]["playerState"];
  if (!roomToState[roomNumber]["isGameActive"])
    return socket.emit("alert", "Game not active!");

  console.log("game ended by player " + JSON.stringify(socketidToUsername));
  updateGameState(false, roomNumber);

  // compute final rewards and emit to all clients for display
  let winners = [];
  let goalSuit = roomToState[roomNumber]["goalSuit"];
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

  // distribute remainder of pot equally to winners
  let remainder = 200 - numGoalSuitTotal * 10;
  let remainingRewards = utils.splitWinnings(remainder, winners.length);
  remainingRewards = utils.shuffle(remainingRewards);
  for (let i = 0; i < winners.length; i++) {
    let winner = winners[i];
    rewards[winner] += remainingRewards[i];
  }

  // TODO: make this an alert via return
  let msg =
    "goal: " + goalSuit + ", rewards: " + JSON.stringify(rewards, null, 1);
  console.log("Game results: " + msg);

  let tradeLog = roomToState[roomNumber]["tradeLog"];
  tradeLog.unshift(msg);
  io.to(roomNumber).emit("tradeLogUpdate", tradeLog);

  // give out rewards and update persistent state
  Object.keys(playerState).map(async player => {
    playerState[player]["money"] += rewards[player];
    await fetch(`${server}/players/${player}/${playerState[player]["money"]}`, {
      method: "PUT"
    });
  });
  updatePlayers(roomNumber, (shield = false));
  io.to(roomNumber).emit("goalSuit", goalSuit);
}

io.on("connection", async function(socket) {
  if (Object.keys(socketidToUsername).length == maxUsers) {
    console.log(
      "Reached maximum capacity, rejecting connection from " + socket.id
    );
    socket.emit("maxCapacity");
    socket.disconnect();
    return;
  }

  console.log("A user connected with socket id: " + socket.id);

  // join specific room
  socket.on("enterRoom", roomNumber => {
    if (!Object.keys(roomToState).includes(roomNumber)) {
      initializeRoom(roomNumber);
    }

    socket.join(roomNumber);
    socketidToRoomNumber[socket.id] = roomNumber;

    socket.emit("enteredRoom", roomNumber); // user data is added on provideUsername
  });

  // allow client to specify username
  socket.on("provideUsername", async username => {
    socketidToUsername[socket.id] = username;
    let roomNumber = socketidToRoomNumber[socket.id]; // assumes enterRoom was already received
    if (Object.keys(roomToState[roomNumber]["playerState"]).length == 4) {
      // room full
      // TODO: emit different message to client than full total capacity
      console.log("Room is full, rejecting connection from " + socket.id);
      socket.emit("maxCapacity");
      socket.disconnect();
      return;
    }

    if (roomToState[roomNumber]["isGameActive"]) {
      socket.emit("alert", "Game already active, cannot join!");
      console.log("Game already active" + roomNumber + ", cannot join!");
      socket.disconnect();
      return;
    }

    socketidToUsername[socket.id] = username;
    usernameToRoomNumber[username] = roomNumber;

    // initialize new player and add to db or retrieve persistent state
    roomToState[roomNumber]["playerState"][username] = utils.deepCopy(
      initialPlayerState
    );
    let money = await fetch(`${server}/players/${username}`);
    money = await money.json();
    if (money.length > 0) {
      roomToState[roomNumber]["playerState"][username]["money"] =
        money[0]["money"]; // populate from db
    } else {
      await fetch(`${server}/players/${username}`, {
        method: "POST"
      });
    }
    updatePlayers(roomNumber);
    broadcastMarketUpdate(roomNumber);
    socket.emit("username", username);
  });

  // on disconnection, server recycles the client username
  socket.on("disconnect", async function() {
    // TODO: be more careful about checking conditions
    let username = socketidToUsername[socket.id];
    let roomNumber = socketidToRoomNumber[socket.id];
    console.log("user disconnected");

    delete socketidToUsername[socket.id];
    delete socketidToRoomNumber[socket.id];
    delete usernameToRoomNumber[username];
    if (roomToState[roomNumber] != null) {
      let playerState = roomToState[roomNumber]["playerState"];
      if (playerState[username] != null) {
        await fetch(
          `${server}/players/${username}/${playerState[username]["money"]}`,
          { method: "PUT" }
        );
        delete playerState[username];
      }
      if (Object.keys(playerState).length == 0) {
        delete roomToState[roomNumber];
      } else {
        updatePlayers(roomNumber);
      }
    }
  });

  // on client command, server parses the command
  socket.on("clientCommand", command => {
    console.log("server has received command: " + command);
    parseCommand(command, socket);
  });
});