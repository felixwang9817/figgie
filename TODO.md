# TODO

Style:

- room list style

## functionality

- https
- if observers is full, trying to join room boots u back in lobby w/o msg

- bots:
  - remove bot
  - better strategy
  - limit amount of money earned by farming bots

- lobby:
  - can play as a guest
  - see list of rooms w/ info and have it update
  - support private rooms by adding in optional pw to room creation
  - leaderboard bug (render executes before componentWillMount finishes)

- game room:
  - people can chat --> this merges with trade-log 


- logging & robustness
  - automated tests? (UI flow tests via puppeteer?)
  - [done-ish] metrics (GA)
    - daily active users, avg minutes/session, avg games/session, etc.
  - unclear what to do with logging, but ideally server side logs should tell us about bugs and help us debug
  - have one person own each file/component (for documentation & understanding)


## Deployment

To deploy on aws:

- install node
- git clone repo
- npm install
- npm run build
- **make sure ENV=production!**
- **make sure all IP addresses in code match server ip (http://3.22.23.96/)**
- install serve and pm2
- make sure postgres is installed and configured (database `players`)
- `pm2 start server.js --watch` to start backend server and watch changes
- `pm2 save && pm2 startup`, then run the code returned by pm2 startup, to auto restart server on machine restart. You can test server is running with `IP:8080/players`
  - `pm2 logs` to see logs
- `sudo serve -s build -l 80` on a tmux window in background to run client-facing server

To update:

- `git pull`
- `npm run build` to rebuild
- You _may_ have to restart the backend server via `pm2 restart all`

## postgres

https://blog.logrocket.com/setting-up-a-restful-api-with-node-js-and-postgresql-d96d6fc892d8

- psql -d postgres -U me
- \c api
- select \* from players;
