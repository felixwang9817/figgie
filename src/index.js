import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import Gateway from "./Gateway";
import * as serviceWorker from "./serviceWorker";
import {server} from "./consts";
import { BrowserRouter } from 'react-router-dom';
import { withRouter } from 'react-router';
import ReactGA from 'react-ga';
ReactGA.initialize('UA-77066601-2');


function render(user) {
  ReactDOM.render(
    (<BrowserRouter>
      <AppContainer>
        <Gateway user={user} />
      </AppContainer>
    </BrowserRouter>),
    document.getElementById("root")
  );
}


fetch(
  server + "/auth",
  { credentials: "include" } // include cookies
)
  .then(response => response.json())
  .then(response => {
    console.log("response.user", response.user);
    render(response.user);
  })
  .catch(err => {
    console.log(err);
    render(null);
  });


class AppContainerRaw extends React.Component {
  componentWillMount() {
    this.unlisten = this.props.history.listen((location, action) => {
      console.log("on route change", location.pathname);
      ReactGA.set({ page: location.pathname }); // Update the user's current page
      ReactGA.pageview(location.pathname); // Record a pageview for the given page
    });

    console.log("at location", this.props.location.pathname);
    ReactGA.set({ page: this.props.location.pathname }); // Update the user's current page
    ReactGA.pageview(this.props.location.pathname); // Record a pageview for the given page

  }
  componentWillUnmount() {
      this.unlisten();
  }

  render() {
     return (
         <div>{this.props.children}</div>
      );
  }
}

const AppContainer = withRouter(AppContainerRaw);


export default server;

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
