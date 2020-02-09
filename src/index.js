import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import Room from "./Room";
import * as serviceWorker from "./serviceWorker";
import { Route, BrowserRouter } from "react-router-dom";


ReactDOM.render(
  <BrowserRouter>
    <div>
      <Route path="/Room" component={Room} />
      <Route exact path="/" component={App} />
      <Route
        render={function() {
          return <p />;
        }}
      />
    </div>
  </BrowserRouter>,
  document.getElementById("root")
);
// ReactDOM.render(<App />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
