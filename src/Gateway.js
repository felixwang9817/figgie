import React from "react";
import queryString from "query-string";
import { Route, BrowserRouter } from "react-router-dom";
import { Redirect } from "react-router";
import App from "./App";
import Login from "./Login";

class Gateway extends React.Component {
  constructor() {
    super();

    this.state = { loggedIn: true };
  }

  render() {
    return (
      <BrowserRouter>
        <div>
          <Route path="/Login" component={Login} />
          <Route exact path="/">
            {this.state.loggedIn ? <App /> : <Redirect to="/Login" />}
          </Route>

          <Route
            render={function() {
              return <p />;
            }}
          />
        </div>
      </BrowserRouter>
    );
  }
}

export default Gateway;
