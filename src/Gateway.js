import React from "react";
import { Route, BrowserRouter } from "react-router-dom";
import App from "./App";
import Login from "./Login";

class Gateway extends React.Component {
  constructor() {
    super();
  }

  render() {
    console.log("At gateway render");
    console.log("user: ", this.props.user);

    return (
      <BrowserRouter>
        <div>
          <Route exact path="/">
            { this.props.user ? <App /> : <Login/> }
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
