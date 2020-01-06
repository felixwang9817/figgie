import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";

class App extends Component {
  state = {
    test: ""
  };

  constructor() {
    super();
  }

  init() {
    fetch(`/sum/3/5`)
      .then(res => res.text())
      .then(res => {
        this.setState({ test: res });
      });
  }

  componentDidMount() {
    this.init();
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <p>This is a test by Felix: {this.state.test}</p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
}

export default App;
