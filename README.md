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

- observer

- show coins gained/lost at end of round
- max length 30 username

* timer for end

* market flash on clear

## Bugs

- random disconnect
  - two distinct problems
    - socket disconnects due to transport close (might be a socket.io problem, and might be a chrome / safari issue)
    - we have to support socket disconnect and handle it properly
      - alert for all players
      - if game is not yet started, refresh page


## Deployment

To deploy on aws:

- install node
- git clone repo
- npm install
- npm run build
- **make sure ENV=production!**

- install serve and pm2
- make sure postgres is installed and configured (database `players`)
- `pm2 start server.js --watch` to start backend server and watch changes
- `pm2 save && pm2 startup`, then run the code returned by pm2 startup, to auto restart server on machine restart. You can test server is running with `IP:8080/players`
  - `pm2 logs` to see logs
- `serve -s build -l 3000` on a tmux window in background to run client-facing server

To update:

- `git pull`
- `npm run build` to rebuild
- You _may_ have to restart the client-facing server.


## postgres

https://blog.logrocket.com/setting-up-a-restful-api-with-node-js-and-postgresql-d96d6fc892d8

psql -d postgres -U me
\c api
select * from players;