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
  console.log("serializing", user);
  cb(null, user);
});

passport.deserializeUser(function(user, cb) {
  console.log("deserializing", user);
  cb(null, user);
});

var server;
if (process.env.NODE_ENV === "production") {
  server = "http://3.22.23.96:8080";
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

  db.createPlayer(req.body.username, req.body.password, (success, msg) => {
    res.send({ success: success, msg: msg });
  });
});

app.post("/enterRoom", function(req, res) {
  // store room number for this username, so that socket can be put into room upon socket connection
  // TODO: get username from req.user instead of req.body, using middleware
  let username = req.body.username;
  let roomNumber = req.body.roomNumber;
  usernameToRoomNumber[username] = roomNumber;
  res.send({ redirect: true });
});

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

// TODO: what triggers this fetch?
app.get("/logout", function(req, res) {
  console.log("logging out");
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
  money: 300,
  netGain: 0, // delta for a single game
  connected: true,
  ready: false
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

  if (!roomToState[roomNumber]) return;
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
function shieldPlayerInfo(username, roomNumber) {
  let playerVisibleState = utils.deepCopy(
    roomToState[roomNumber]["playerState"]
  );

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
  // first, get usernames associated with roomNumber
  let usernames = Object.keys(roomToState[roomNumber]["playerState"]);

  // for each username, shield appropriately and emit to corresponding socket
  for (const username of usernames) {
    let socketid = usernameToSocketid[username];
    io.to(socketid).emit(
      "playerUpdate",
      shield
        ? shieldPlayerInfo(username, roomNumber)
        : roomToState[roomNumber]["playerState"]
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
}

function startGame(roomNumber) {
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

  console.log("preshuffle: " + cards);
  utils.shuffle(cards);

  console.log("goal: " + goal);
  console.log("cards: " + cards);
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
  io.to(roomNumber).emit("gameTimeEnd", roomToState[roomNumber]["gameTimeEnd"]);
  io.to(roomNumber).emit("goalSuit", "");
  io.to(roomNumber).emit("alert", "Game on!"); // tell all players

  setTimeout(() => endGame(roomNumber), gameTime);
}

function endGame(roomNumber) {
  if (!roomToState[roomNumber]["isGameActive"]) return;
  io.to(roomNumber).emit("alert", "Time's up!");

  let playerState = roomToState[roomNumber]["playerState"];
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
    db.updatePlayer(player, playerState[player]["money"]);
  });

  updatePlayers(roomNumber, (shield = false));
  io.to(roomNumber).emit("goalSuit", goalSuit);
  // reset timer
  roomToState[roomNumber]["gameTimeEnd"] = null;
  io.to(roomNumber).emit("gameTimeEnd", roomToState[roomNumber]["gameTimeEnd"]);
}

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
  );

  if (!Object.keys(roomToState).includes(roomNumber)) {
    initializeRoom(roomNumber);
  }

  usernameToSocketid[username] = socket.id;
  socket.join(roomNumber);

  let currPlayers = Object.keys(roomToState[roomNumber]["playerState"]);
  if (
    (currPlayers.length == kMaxPlayers ||
      roomToState[roomNumber]["isGameActive"]) &&
    !currPlayers.includes(username)
  ) {
    // room full
    console.log(
      "Room is full or active, rejecting connection from " + socket.id
    );
    socket.emit("roomFull");
    socket.disconnect();
    return;
  }

  if (!roomToState[roomNumber]["playerState"][username]) {
    // user is joining so they get initial player state
    roomToState[roomNumber]["playerState"][username] = utils.deepCopy(
      initialPlayerState
    );
  } else {
    // user is reconnecting so we restore player state and change connected to true
    roomToState[roomNumber]["playerState"][username]["connected"] = true;
  }

  // async update money
  db.getMoneyByUsername(username, money => {
    roomToState[roomNumber]["playerState"][username]["money"] = money;
    updatePlayers(roomNumber);
  });

  // update cliend UI to reflect current game state
  socket.emit("gameStateUpdate", roomToState[roomNumber]["isGameActive"]);
  socket.emit("gameTimeEnd", roomToState[roomNumber]["gameTimeEnd"]);
  let tradeLog = roomToState[roomNumber]["tradeLog"];
  io.to(roomNumber).emit("tradeLogUpdate", tradeLog);
  broadcastMarketUpdate(roomNumber);

  // TODO2: eventually add cleanup on a timer after game ends, boot people to lobby unless
  // they are active and want to restart a game in the room

  socket.on("disconnect", async function() {
    // TODO: be more careful about checking conditions
    // if (!socket.handshake.session.passport) return;
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

          if (Object.keys(playerState).length == 0) {
            delete roomToState[roomNumber];
          } else {
            updatePlayers(roomNumber);
          }
        }
      }
    }

    console.log(
      "current room state at end of disconnect",
      roomToState[roomNumber]
    );
  });

  // on client command, server parses the command
  socket.on("clientCommand", command => {
    console.log("server has received command: " + command);
    parseCommand(command, socket);
  });
});
