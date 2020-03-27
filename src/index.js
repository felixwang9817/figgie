import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import Gateway from "./Gateway";
import * as serviceWorker from "./serviceWorker";
import {server} from "./consts";

fetch(
  server + "/auth",
  { credentials: "include" } // include cookies
)
  .then(response => response.json())
  .then(response => {
    console.log("response.user", response.user);
    ReactDOM.render(
      <Gateway user={response.user} />,
      document.getElementById("root")
    );
  })
  .catch(err => {
    console.log(err);
    ReactDOM.render(<Gateway />, document.getElementById("root"));
  });

export default server;

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
