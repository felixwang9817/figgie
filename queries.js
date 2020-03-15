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

const createPlayer = (request, response) => {
  console.log("creating player");
  const username = request.params.username;
  const money = 300;

  pool.query(
    "INSERT INTO players (username, money) VALUES ($1, $2)",
    [username, money],
    (error, results) => {
      if (error) {
        throw error;
      }
      response.status(201).send(`User added with username: ${username}`);
    }
  );
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
  process.nextTick(function() {

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
  });
}

module.exports = {
  getPlayers,
  getMoneyByUsername,
  createPlayer,
  updatePlayer,
  deletePlayer,
  findByUsername
};
