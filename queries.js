const bcrypt = require('bcrypt');
const saltRounds = 10;
const Pool = require("pg").Pool;
const pool = new Pool({
  user: "me",
  host: "localhost",
  database: "api",
  password: "password",
  port: 5432
});

const getPlayers = (request, response) => {
  pool.query("SELECT * FROM players ORDER BY id ASC", (error, results) => {
    if (error) {
      throw error;
    }
    response.status(200).json(results.rows);
  });
};

const getMoneyByUsername = (request, response) => {
  const username = request.params.username;

  pool.query(
    "SELECT money FROM players WHERE username = $1",
    [username],
    (error, results) => {
      if (error) {
        throw error;
      }
      response.status(200).json(results.rows);
    }
  );
};

function createPlayer(username, password, cb) {
  // check if player exists
  findByUsername(username, ((_, result) => {
    console.log(_, result);
    if (result) {
      // TODO: propagate username already exists error
      return cb(false, "Username already exists!");
    }

    console.log("creating player");
    const money = 300;
    bcrypt.hash(password, saltRounds, function(err, hashedpw) {
      if (err) {
        console.log("error during hashing", err)
        return cb(false, "Error hashing pw.");
      }

      // Store hash in your password DB.
      pool.query(
        "INSERT INTO players (username, money, hashedpw) VALUES ($1, $2, $3)",
        [username, money, hashedpw],
        (error, results) => {
          if (error) {
            console.log("error during player insertion", err);
            return cb(false, "Error adding player to db.");
          }
          return cb(true, "Signup successful!");
        }
      );
    });
  }));
};

const updatePlayer = (request, response) => {
  const username = request.params.username;
  const money = request.params.money;

  pool.query(
    "UPDATE players SET money = $1 WHERE username = $2",
    [money, username],
    (error, results) => {
      if (error) {
        throw error;
      }
      response.status(200).send(`User modified with username: ${username}`);
    }
  );
};

const deletePlayer = (request, response) => {
  const username = request.params.username;

  pool.query(
    "DELETE FROM players WHERE username = $1",
    [username],
    (error, results) => {
      if (error) {
        throw error;
      }
      response.status(200).send(`User deleted with username: ${username}`);
    }
  );
};

// passport.js authenticate
const findByUsername = function(username, cb) {
  pool.query(
    "SELECT * FROM players WHERE username = $1",
    [username],
    (error, results) => {
      if (error) {
        return cb(null, null);
      }
      return cb(null, results.rows[0]);
    }
  );
}

module.exports = {
  getPlayers,
  getMoneyByUsername,
  createPlayer,
  updatePlayer,
  deletePlayer,
  findByUsername
};
