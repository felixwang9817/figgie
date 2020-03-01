import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import Gateway from "./Gateway";
import * as serviceWorker from "./serviceWorker";
import { Route, BrowserRouter } from "react-router-dom";

var server;
if (process.env.NODE_ENV == "production") {
  server = "http://3.136.26.146:8080";
} else {
  server = "http://localhost:3000";
}


// ReactDOM.render(
//   <BrowserRouter>
//     <div>
//       <Route path="/Room" component={Room} />
//       <Route exact path="/" component={App} />
//       <Route
//         render={function() {
//           return <p />;
//         }}
//       />
//     </div>
//   </BrowserRouter>,
//   document.getElementById("root")
// );

fetch(server + '/auth').then((response) => response.json())
  .then((user) => {
    ReactDOM.render(<Gateway user={user} />, document.getElementById("root"));
  }).catch(err => {
    console.log(err);
    ReactDOM.render(<Gateway />, document.getElementById("root"));
  });


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
