## Figgie

Multiplayer Figgie built using React, express, and socket.io

http://3.136.26.146:3000/

# TODO

## style

- favicon
- prettier rules page
- prettier waiting page

## functionality

- start/end only when all 4 players confirm

- alert on login fail

- rooms

  - waiting room that auto-joins if players leave

- persistent user

  - then allow users to choose username upon joining
  - then, make accounts and pw
  - finally, move to actual DB (Postgres, Firebase, etc.)

- observer

<<<<<<< Updated upstream
- show coins gained/lost at end of round
- max length 30 username
- emojis in username

=======
- timer for end

- market flash on clear

## Bugs

- random disconnect
  - two distinct problems
    - socket disconnects due to transport close (might be a socket.io problem, and might be a chrome / safari issue)
    - we have to support socket disconnect and handle it properly
      - alert for all players
      - if game is not yet started, refresh page
>>>>>>> Stashed changes

## Deployment

To deploy on aws:

- install node
- git clone repo
- npm install
- npm run build
- make sure IP address is set to the server IP (ENV var, but it seems broken sometimes so just hardcode it in App.js) and ports 3000 and 8080 are open

- install serve and pm2
- make sure postgres is installed and configured (database `players`)
- `pm2 start server.js --watch` to start backend server and watch changes
- `pm2 save && pm2 startup`, then run the code returned by pm2 startup, to auto restart server on machine restart. You can test server is running with `IP:8080/players`
  - `pm2 logs` to see logs
- `serve -s build -l 3000` to run client-facing server
  - TODO: figure out a way to restart this on error

To update, just run `git clone` and `npm run build`. You _may_ have to restart the client-facing server.
