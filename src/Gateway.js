import React from "react";
import { Route, BrowserRouter } from "react-router-dom";
import App from "./App";
import Login from "./Login";
import Signup from "./Signup";

class Gateway extends React.Component {
  render() {
    return (
      <BrowserRouter>
        <div>
          <Route exact path="/">
            { this.props.user ? <App user={this.props.user} /> : <Login/> }
          </Route>


          <Route exact path="/signup">
            <Signup />  
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
