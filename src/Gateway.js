import React from "react";
import { Route, BrowserRouter } from "react-router-dom";
import App from "./App";
import Login from "./Login";
import Signup from "./Signup";
import { createBrowserHistory } from 'history';
import ReactGA from 'react-ga';
ReactGA.initialize('UA-77066601-2');

const history = createBrowserHistory();

// Initialize google analytics page view tracking
history.listen(location => {
  console.log("logging ", location.pathname);
  ReactGA.set({ page: location.pathname }); // Update the user's current page
  ReactGA.pageview(location.pathname); // Record a pageview for the given page
});

class Gateway extends React.Component {
  render() {
    return (
      <BrowserRouter history={history}>
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
