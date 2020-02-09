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

- show coins gained/lost at end of round
- max length 30 username
- emojis in username


## Deployment

To deploy on aws:
- install node
- git clone repo
- npm install
- npm run build
- **make sure IP address is set to the server IP (ENV var, but it seems broken sometimes so just hardcode it in App.js) and ports 3000 and 8080 are open**

- install serve and pm2
- make sure postgres is installed and configured (database `players`)
- `pm2 start server.js --watch` to start backend server and watch changes
- `pm2 save && pm2 startup`, then run the code returned by pm2 startup, to auto restart server on machine restart. You can test server is running with `IP:8080/players`
  - `pm2 logs` to see logs
- `serve -s build -l 3000` to run client-facing server
  - TODO: figure out a way to restart this on error


To update:
- `git stash` to stash the IP address change
- `git pull` and `git stash apply`
- `npm run build` to rebuild
- You *may* have to restart the client-facing server.