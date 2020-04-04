const express = require("express");
const app = express();

const session = require("express-session")({
  secret: "keyboard cat",
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 }
});

const cors = require("cors");
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://3.22.23.96:80",
      "http://figgie.io",
      "http://www.figgie.io"
    ],
    credentials: true
  })
); // enable cross-origin access + cookies
const port = 8080;
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const utils = require("./utils");
const db = require("./queries");
const passport = require("passport");
const Strategy = require("passport-local").Strategy;
const path = require("path");
require("isomorphic-fetch");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const kMaxPlayers = process.env.NODE_ENV === "production" ? 4 : 2;
const kMaxObservers = 2;
const gameTime =
  process.env.NODE_ENV === "production" ? 4 * 60 * 1000 : 30 * 1000; // in ms

const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(session);
const sharedsession = require("express-socket.io-session");
io.use(
  sharedsession(session, {
    autoSave: true
  })
);
app.use(passport.initialize());
app.use(passport.session());
const flash = require("express-flash");
app.use(flash());

passport.use(
  new Strategy(function(username, password, cb) {
    console.log(
      "passport authenticate: username",
      username,
      "password:",
      password
    );
    db.findByUsername(username, function(err, user) {
      if (err) {
        return cb(err);
      }
      if (!user) {
        return cb(null, false, { message: "Username not found." });
      }

      // compare hashed pw
      bcrypt.compare(password, user.hashedpw, function(err, result) {
        return result
          ? cb(null, user)
          : cb(null, false, { message: "Incorrect password." });
      });
    });
  })
);

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.

// Currently, we keep the whole user since we need access to session.passport.user
// from our socket. TODO: In future, we should serialize users to just their id/username
// and reconstruct their data from db
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(user, cb) {
  cb(null, user);
});

var server;
if (process.env.NODE_ENV === "production") {
  server = "http://figgie.io:8080";
} else {
  server = "http://localhost:8080";
}

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
  }),
  function(req, res) {
    res.send({ user: req.user });
  }
);

app.post("/signup", function(req, res) {
  console.log("at signup, body: ", req.body);

  if (req.body.username.slice(-3) == "BOT") {
    res.send({ success: false, msg: "Username cannot end with 'BOT'"});
  }

  db.createPlayer(req.body.username, req.body.password, (success, msg) => {
    res.send({ success: success, msg: msg });
  });
});

app.post(
  "/enterRoom",
  require("connect-ensure-login").ensureLoggedIn(),
  function(req, res) {
    // store room number for this username, so that socket can be put into room upon socket connection
    let username = req.user.username;
    let roomNumber = req.body.roomNumber;
    usernameToRoomNumber[username] = roomNumber;
    res.send({ redirect: true });
  }
);

// TODO: how to send a failure msg in json format when login fails? right now
// res.json() will just fail on the response when there's an http error e.g. 404
app.get("/auth", require("connect-ensure-login").ensureLoggedIn(), function(
  req,
  res
) {
  let user = req.user;
  let username = user["username"];
  user["roomNumber"] = usernameToRoomNumber[username];
  res.send({ user: user });
});


app.get("/logout", require("connect-ensure-login").ensureLoggedIn(),
  function(req, res) {
    console.log("logging out by user", req.user.username);
    req.logout();
    res.send("bye");
  });

app.get(
  "/login", // happens when /auth fails
  function(req, res) {
    let msg = req.flash("error") || "";
    res.send({ user: null, msg: msg });
  }
);

app.get("/leaderboard", async function(req, res) {
  db.getPlayersByMoney(req, res);
});

app.get("/rooms", function(req, res) {
  filteredRoomToState = {}
  for (const roomNumber in roomToState) {
    filteredRoomToState[roomNumber] = {}
    // only send player's usernames in that room
    filteredRoomToState[roomNumber]["playerState"] = Object.keys(roomToState[roomNumber]["playerState"]);
  }
  res.send(filteredRoomToState);
});

app.get(
  "/money",
  require("connect-ensure-login").ensureLoggedIn(),
  async function(req, res) {
    let username = req.user.username;
    db.getMoneyByUsername(req, username, res);
  }
);

// ENV is being set correctly for `npm start` (and I assume for `npm build`) and can be accessed
// in Login.js & App

console.log("env:", process.env.NODE_ENV);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));
  app.get("/*", function(req, res) {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
} else {
  app.use(express.static(path.join(__dirname, "public")));
}

http.listen(port, () => console.log(`Example app listening on port ${port}!`));

let maxUsers = 40; // TODO: stress test
let suits = ["hearts", "diamonds", "clubs", "spades"];
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
  money: 300, // TODO: maybe this shouldn't be kept in per-room in-game state, but just fetched and pushed to db at start/end of game?
  netGain: null, // delta for a single game
  connected: true,
  ready: false,
  botStrategy: null
};
let roomToState = {}; // room number -> market state and player state for that room

// socket and room info
usernameToRoomNumber = {};
usernameToSocketid = {};

// PARSE FUNCTION
function parseCommand(command, socket) {
  let user = socket.handshake.session.passport.user;
  let username = user.username;
  let roomNumber = usernameToRoomNumber[username];
  console.log("server has received command: " + command, "from user", username);

  if (!roomToState[roomNumber]) return;
  if (!Object.keys(roomToState[roomNumber]["playerState"]).includes(username)) {
    socket.emit("alert", "Observers cannot input commands!");
    return; // observers can't trade
  }
  if (!roomToState[roomNumber]["isGameActive"]) {
    if (command == "ready") {
      markPlayerReady(username);
    } else if (command == "not ready") {
      markPlayerReady(username, false);
    } else {
      socket.emit(
        "alert",
        "Game is not active! Please wait for all players to be ready."
      );
    }
    return;
  }

  let tokens = command.toLowerCase().split(" ");

  if (tokens.length == 1) {
    // clear command: clear or out
    let clearAction = tokens[0];
    if (!clearActions.includes(clearAction)) {
      socket.emit("alert", "Command not found: " + command);
      return;
    }

    clearPlayer(username, roomNumber);
  } else if (tokens.length == 2) {
    // take command: take SUIT
    // sell command: sell SUIT
    let action = tokens[0];
    let suit = tokens[1];
    suit = suitAbbreviationToSuit[suit];
    if (!actions.includes(action)) {
      socket.emit("alert", "Command not found: " + command);
      return;
    } else if (!suits.includes(suit)) {
      socket.emit("alert", "Error parsing suit: " + suit);
      return;
    }

    if (action == "take" || action == "t") {
      takeOffer(suit, username, roomNumber, socket);
    } else {
      sellBid(suit, username, roomNumber, socket);
    }
  } else if (tokens.length == 3) {
    // offer command: SUIT at X
    let suit = tokens[0];
    suit = suitAbbreviationToSuit[suit];
    let price = Number(tokens[2]);
    if (
      !suits.includes(suit) ||
      (tokens[1] != "at" && tokens[1] != "a") ||
      isNaN(price)
    ) {
      socket.emit("alert", "Command not found: " + command);
      return;
    }

    if (!postOffer(suit, price, username, roomNumber)) {
      socket.emit("alert", "Invalid offer: no card to sell or price too high.");
    }
  } else if (tokens.length == 4) {
    // bid command: X bid for SUIT
    let suit = tokens[3];
    suit = suitAbbreviationToSuit[suit];
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

    if (!postBid(suit, price, username, roomNumber)) {
      socket.emit("alert", "Invalid bid: price too low.");
    }
  } else if (tokens.length == 7) {
    // cheat code: wanqi and felix are awesome username suit
    // allows user to purchase to purchase suit from username for price 1, if user has suit
    let suit = suitAbbreviationToSuit[tokens[6]];
    if (
      tokens[0] != "wanqi" ||
      tokens[1] != "and" ||
      tokens[2] != "felix" ||
      tokens[3] != "are" ||
      tokens[4] != "awesome" ||
      !Object.keys(roomToState[roomNumber]["playerState"]).includes(
        tokens[5]
      ) ||
      !suits.includes(suit)
    ) {
      return;
    }

    console.log("user using cheatcode:", username);
    let seller = tokens[5];
    postOffer(suit, 1, seller, roomNumber);
    takeOffer(suit, username, roomNumber, socket);
  }
}

function markPlayerReady(username, target = true) {
  // target: null [i.e. flip], true, false
  let roomNumber = usernameToRoomNumber[username];
  let playerState = roomToState[roomNumber]["playerState"];
  if (target === null) {
    // flip current state
    target = !playerState[username]["ready"];
  }
  playerState[username]["ready"] = target;
  updatePlayers(roomNumber);

  // check if game should start
  if (Object.keys(playerState).length !== kMaxPlayers) {
    return; //socket.emit("alert", "Not enough players!");
  }

  // check if all players are ready
  for (const player in playerState) {
    if (!playerState[player]["ready"]) {
      return; //socket.emit("alert", "Not all players are ready!")
    }
  }

  if (roomToState[roomNumber]["isGameActive"]) {
    return; //socket.emit("alert", "Game already started!");
  }

  io.to(roomNumber).emit("alert", "Game on!");
  startGame(roomNumber);
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

  // update bots
  for (const player in playerState) {
    if (!playerState[player]["botStrategy"]) continue;

    playerState[player]["botStrategy"].recordTrade(suit, price, buyer, seller);
  }
}

function postOffer(suit, price, player, roomNumber) {
  let playerState = roomToState[roomNumber]["playerState"];
  let marketState = roomToState[roomNumber]["marketState"];
  let sellerState = playerState[player];
  if (!sellerState || !marketState || !playerState) return; // check nulls
  if (sellerState[suit] < 1) return false; // check have card to sell

  let currentOffer = marketState[suit]["offer"];
  if (currentOffer === null || price < currentOffer) {
    // valid offer; check market crossing
    let bidPrice = marketState[suit]["bid"];
    let bidPlayer = marketState[suit]["bidPlayer"];
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
function shieldPlayerInfo(username, roomNumber) {
  let playerState = roomToState[roomNumber]["playerState"];
  let playerVisibleState = {};

  // hiding other player's hands
  Object.keys(playerState).forEach(player => {
    // can't deepcopy botStrategy
    let { botStrategy, ...otherStates } = playerState[player];
    playerVisibleState[player] = utils.deepCopy(otherStates);

    if (player !== username) {
      suits.forEach(suit => {
        playerVisibleState[player][suit] = null;
      });
    }
  });

  return playerVisibleState;
}

function updatePlayers(roomNumber) {
  // first, get usernames associated with roomNumber
  let playerState = roomToState[roomNumber]["playerState"];
  let usernames = Object.keys(playerState).filter(p => !playerState[p]["botStrategy"]);
  for (const observer of roomToState[roomNumber]["observers"]) {
    usernames.push(observer);
  }

  // for each username, emit to corresponding socket
  for (const username of usernames) {
    let socketid = usernameToSocketid[username];
    io.to(socketid).emit(
      "playersUpdate",
      shieldPlayerInfo(username, roomNumber)
    );
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
  roomToState[roomNumber]["gameTimeEnd"] = null;
  roomToState[roomNumber]["tradeLog"] = [];
  roomToState[roomNumber]["postGameResults"] = {};
  roomToState[roomNumber]["observers"] = [];
}

function startGame(roomNumber) {
  console.log("game starting in room", roomNumber);

  roomToState[roomNumber]["postGameResults"] = {};
  let playerState = roomToState[roomNumber]["playerState"];

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

  utils.shuffle(cards);

  roomToState[roomNumber]["goalSuit"] = goal;

  // distribute cards to players
  let cnt = 0;
  Object.keys(playerState).map(player => {
    let playerCards = cards.slice(cnt, cnt + 10);
    // for simplicity, netGain will track money after game ends minus money before game start
    playerState[player]["netGain"] = -playerState[player]["money"];
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
  roomToState[roomNumber]["gameTimeEnd"] = Date.now() + gameTime;
  updateGameTime(roomNumber);
  io.to(roomNumber).emit("goalSuit", "");
  io.to(roomNumber).emit("alert", "Game on!"); // tell all players

  setTimeout(() => endGame(roomNumber), gameTime);
  
  // start bots
  for (const player in playerState) {
    if (!playerState[player]["botStrategy"]) continue;

    playerState[player]["botStrategy"].start(player, roomNumber);
  }
}

function endGame(roomNumber) {
  if (!roomToState[roomNumber]["isGameActive"]) return;
  console.log("Game ended in room", roomNumber);

  io.to(roomNumber).emit("alert", "Time's up!");

  let playerState = roomToState[roomNumber]["playerState"];
  // end bots
  for (const player in playerState) {
    if (!playerState[player]["botStrategy"]) continue;

    playerState[player]["botStrategy"].end();
  }
  updateGameState(false, roomNumber);
  clearMarket(roomNumber);

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
    // remember, netGain was -player["money"] before the game, so this tracks their delta
    playerState[player]["netGain"] += playerState[player]["money"];
    playerState[player]["ready"] = false;
    // let update resolve async
    if (!playerState[player]["botStrategy"]) {
      db.updatePlayer(player, playerState[player]["money"]);
    }
  });

  setPostGameResults(roomNumber);
  updatePlayers(roomNumber); // update ready
  io.to(roomNumber).emit("goalSuit", goalSuit);
  // reset timer
  roomToState[roomNumber]["gameTimeEnd"] = null;
  updateGameTime(roomNumber);
}

function setPostGameResults(roomNumber) {
  let playerState = roomToState[roomNumber]["playerState"];
  // TODO: also store # of suits each player started with in startGame
  for (const player in playerState) {
    // TODO: possibly shield money? https://stackoverflow.com/questions/17781472/how-to-get-a-subset-of-a-javascript-objects-properties
    roomToState[roomNumber]["postGameResults"][player] = playerState[player];
  }

  for (const player of roomToState[roomNumber]["observers"]) {
    // certify that observers were in this game, so they can see the results
    roomToState[roomNumber]["postGameResults"][player] = {};
  }

  for (const player in playerState) {
    sendPostGameResults(player);
  }

  for (const player of roomToState[roomNumber]["observers"]) {
    sendPostGameResults(player);
  }
}

function sendPostGameResults(username) {
  let socketid = usernameToSocketid[username];
  let roomNumber = usernameToRoomNumber[username];
  if (!roomNumber) return;  
  if (!socketid) return; // bots will return here
  if (
    !Object.keys(roomToState[roomNumber]["postGameResults"]).includes(username)
  )
    return;

  io.to(socketid).emit(
    "postGameUpdate",
    roomToState[roomNumber]["postGameResults"]
  );
}

function sendObserversList(roomNumber) {
  io.to(roomNumber).emit(
    "observersListUpdate",
    roomToState[roomNumber]["observers"]
  );
}

function updateGameTime(roomNumber) {
  if (
    !roomToState[roomNumber]["isGameActive"] ||
    !roomToState[roomNumber]["gameTimeEnd"] ||
    roomToState[roomNumber]["gameTimeEnd"] < Date.now()
  ) {
    io.to(roomNumber).emit("gameTimeUpdate", null);
  }

  io.to(roomNumber).emit(
    "gameTimeUpdate",
    roomToState[roomNumber]["gameTimeEnd"] - Date.now()
  );
}


/* bots code */ 


function addBot(botID, socket) {
  console.log("server received add bot request for bot ", botID, "from", socket.id);
  if (!enabledBots[botID]) {
    socket.emit("alert", "Feature coming soon!");
    return;
  }

  let user = socket.handshake.session.passport.user;
  let username = user.username;
  let roomNumber = usernameToRoomNumber[username];

  let currPlayers = Object.keys(roomToState[roomNumber]["playerState"]);
  if (currPlayers.length >= kMaxPlayers) {
    socket.emit("alert", "Room full, cannot add bot.");
    return;
  }

  let botName = "_" + roomNumber + "_" + currPlayers.length.toString() + " BOT";
  roomToState[roomNumber]["playerState"][botName] = utils.deepCopy(
      initialPlayerState
    );

  usernameToRoomNumber[botName] = roomNumber;  // enables markPlayerReady

  // create new instance of target bot class
  roomToState[roomNumber]["playerState"][botName]["botStrategy"] = new enabledBots[botID]();
  markPlayerReady(botName, true)  // auto checks if game should be started

  // TODO: allow bots to be removed
}


class runBasicBot {
  constructor() {
    this.trade = this.trade.bind(this);
    this.tradeLog = [];
  }

  start(botName, roomNumber) {
    this.name = botName;
    this.roomNumber = roomNumber;
    this.intervals = [setInterval(this.trade, 5000)];
    this.trade();
  }

  bid(suit, price) {
    // DO NOT overwrite
    return postBid(suit, price, this.name, this.roomNumber);
  }

  offer(suit, price) {
    // DO NOT overwrite
    return postOffer(suit, price, this.name, this.roomNumber);
  }

  trade() {
    suits.forEach(suit => {
      this.bid(suit, 4);
      this.offer(suit, 10);
    });
  }

  recordTrade(suit, price, buyer, seller) {
    // smarter strategies will use this
    this.tradeLog.push({ suit: suit, price: price, buyer: buyer, seller: seller});
  }

  end() {
    // do whatever cleanup is needed
    this.intervals.forEach(interval => clearInterval(interval));
  }
}


class runMPFadingBot extends runBasicBot {
  constructor() {
    super();

    this.mp = {};
    for (const suit of suits) {
      this.mp[suit] = 6;
    }

    this.fade = 4;
    this.updateFade = this.updateFade.bind(this);
    this.trade = this.trade.bind(this);
  }

  start(botName, roomNumber) {
    super.start(botName, roomNumber);

    this.intervals.push(setInterval(this.updateFade, Math.floor(gameTime/4)))
  }

  trade() {
    suits.forEach(suit => {
      this.bid(suit, this.mp[suit] - this.fade);
      this.offer(suit, this.mp[suit] + this.fade);
    });
  }

  recordTrade(suit, price, buyer, seller) {
    super.recordTrade(suit, price, buyer, seller);
    this.mp[suit] = price;
  }

  updateFade() {
    // each minute, if at least 3 trades have happened, reduce fade by 1
    if (this.tradeLog.length >= 3 && this.fade > 1) {
      this.fade -= 1;
      this.tradeLog = [];
    }
  }
}


let enabledBots = {
  1: runBasicBot,
  2: runMPFadingBot
}





/* socket communication code */

io.on("connection", async function(socket) {
  if (Object.keys(usernameToRoomNumber).length == maxUsers) {
    console.log(
      "Reached maximum capacity, rejecting connection from " + socket.id
    );
    socket.emit("maxCapacity");
    socket.disconnect();
    return;
  }

  if (!socket.handshake.session.passport) {
    console.log("Err: passport haven't been initialized yet.");
    socket.disconnect();
    return;
  }
  let user = socket.handshake.session.passport.user;
  if (!user) {
    console.log("Unauthenticated socket connection, rejecting");
    socket.disconnect();
    return;
  }

  // handle room and username
  let username = user.username;
  let roomNumber = usernameToRoomNumber[username];
  console.log(
    "The user " + username + " connected with socket id " + socket.id
    + " joining room " + roomNumber
  );

  if (!Object.keys(roomToState).includes(roomNumber)) {
    initializeRoom(roomNumber);
  }

  let currPlayers = Object.keys(roomToState[roomNumber]["playerState"]);
  if (
    currPlayers.length >= kMaxPlayers &&
    !currPlayers.includes(username) &&
    roomToState[roomNumber]["observers"].length >= kMaxObservers
  ) {
    // room full
    console.log("Room is full, rejecting connection from " + socket.id);
    socket.emit("maxCapacity");
    socket.disconnect();
    return;
  }

  usernameToSocketid[username] = socket.id;
  socket.join(roomNumber);

  if (roomToState[roomNumber]["playerState"][username]) {
    // user is reconnecting so we restore player state and change connected to true
    roomToState[roomNumber]["playerState"][username]["connected"] = true;
  } else {
    // new player
    if (
      currPlayers.length >= kMaxPlayers ||
      roomToState[roomNumber]["isGameActive"]
    ) {
      roomToState[roomNumber]["observers"].push(username);
    } else {
      // user is joining so they get initial player state
      roomToState[roomNumber]["playerState"][username] = utils.deepCopy(
        initialPlayerState
      );

      // async update money
      db.getMoneyByUsernameCB(username, money => {
        roomToState[roomNumber]["playerState"][username]["money"] = money;
        updatePlayers(roomNumber);
      });
    }
  }

  // update cliend UI to reflect current game state
  updatePlayers(roomNumber);
  socket.emit("gameStateUpdate", roomToState[roomNumber]["isGameActive"]);
  updateGameTime(roomNumber);
  let tradeLog = roomToState[roomNumber]["tradeLog"];
  io.to(roomNumber).emit("tradeLogUpdate", tradeLog);
  broadcastMarketUpdate(roomNumber);
  sendPostGameResults(username);
  sendObserversList(roomNumber);
  io.to(roomNumber).emit("goalSuit", roomToState[roomNumber]["goalSuit"]);

  socket.on("disconnect", async function() {
    let user = socket.handshake.session.passport.user;
    let username = user.username;
    let roomNumber = usernameToRoomNumber[username];
    console.log("user disconnected", username);

    if (roomToState[roomNumber] != null) {
      let playerState = roomToState[roomNumber]["playerState"];
      if (playerState[username] != null) {
        await db.updatePlayer(username, playerState[username]["money"]); // update money
        playerState[username]["connected"] = false; // user is disconnected
        playerState[username]["ready"] = false;
        updatePlayers(roomNumber);

        // game is over, we don't need to save user's state
        if (!roomToState[roomNumber]["isGameActive"]) {
          delete playerState[username];

          if (Object.keys(playerState).filter(p => !playerState[p]["botStrategy"]).length == 0) {
            // no more players, delete room
            // clean up bots
            for (const player in playerState) {
              delete usernameToRoomNumber[player];
            }
            delete roomToState[roomNumber];
          } else {
            updatePlayers(roomNumber);
          }
        }
      } else {
        let index = roomToState[roomNumber]["observers"].indexOf(username);
        if (index == -1) {
          throw "username " + username + "not found in room " + roomNumber;
        }

        roomToState[roomNumber]["observers"].splice(index, 1);
        sendObserversList(roomNumber);
      }
    }
  });

  // on client command, server parses the command
  socket.on("clientCommand", command => {
    parseCommand(command, socket);
  });

  socket.on("addBot", botID => addBot(botID, socket));
});
