## Figgie

Multiplayer Figgie built using React, express, and socket.io

http://3.136.26.146:3000/

# TODO

## style

- favicon

## functionality

Ideal flow:
- can play as a guest, init landing page in lobby
- lobby:
  - see list of rooms, can join or create new room
    - support private rooms by adding in optional pw to room creation
  - can sign up / login / logout
  - rules
  - leaderboard
  - can see active games and spectate
  - can observe full rooms, and join if it becomes unfull

- game room:
  - button to leave room & return to lobby --> instead of logout
  - each player can toggle ready/not-ready --> goes where #-cards currently is
  - people can chat --> this merges with trade-log
  - game starts when all 4 players are ready, sets a timer for auto end --> top left

  - show net delta in money for each player at end of round
  - if player leaves while game not active, server waits 5s to see if player will reconnect. If not, remove player from room.

  - flash visualization on each market update


- logging & robustness
  - automated tests? (UI flow tests via puppeteer?)
  - metrics
    - daily active users, avg minutes/session, avg games/session, etc.
  - unclear what to do with logging, but ideally server side logs should tell us about bugs and help us debug
  - split larger files into smaller components, have one person own each file (for documentation & understanding)




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
select \* from players;
