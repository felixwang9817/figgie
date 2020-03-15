import React from "react";
import { Route, BrowserRouter } from "react-router-dom";
import App from "./App";
import Login from "./Login";

class Gateway extends React.Component {
  render() {
    return (
      <BrowserRouter>
        <div>
          <Route exact path="/">
            { this.props.user ? <App user={this.props.user} /> : <Login/> }
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
