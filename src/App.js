import React, { Component } from "react";
import socketIOClient from "socket.io-client";
import logo from "./logo.svg";
import "./App.css";

class Player extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      diamonds: 2,
      clubs: null,
      hearts: null,
      spades: null,
      num_cards: 10,
      money: 50,
      id: props.id
    };
  }

  render() {
    var cards = "";

    // TODO: prettify this
    if (this.state.diamonds === null) {
      cards += "";
    } else {
      cards += this.state.diamonds.toString() + " diamonds ";
    }

    if (this.state.clubs === null) {
      cards += "";
    } else {
      cards += this.state.clubs.toString() + " clubs ";
    }

    if (this.state.hearts === null) {
      cards += "";
    } else {
      cards += this.state.hearts.toString() + " hearts ";
    }

    if (this.state.spades === null) {
      cards += "";
    } else {
      cards += this.state.spades.toString() + " spades ";
    }

    return (
      <div>
        <span class="player_id"> player #{this.state.id} </span>
        {cards}
        <span class="num_cards"> {this.state.num_cards} cards </span>
        <span class="money"> {this.state.money} money </span>
      </div>
    );
  }
}

class Market extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bids: {
        clubs: [1, 0],
        spades: [2, 0],
        hearts: [3, 2],
        diamonds: [4, 1]
      },
      offers: {
        clubs: 11,
        spades: 12,
        hearts: 13,
        diamonds: 14
      }
    };
  }

  render() {
    return (
      <div id="market">
        market
        {Object.keys(this.state.bids).map((key, val) => (
          <p>
            {" "}
            {this.state.bids[key][0]} bid (#{this.state.bids[key][1]}) for {key}
            .{" "}
          </p>
        ))}
        {
          // TODO: offers, display in bidding language?
        }
      </div>
    );
  }
}

class App extends Component {

  constructor() {
    super();

    this.state = {test: "",
                  trade_command: '',};

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  async init() {
    let res = await fetch(`/test`);
    let text = await res.text();
    console.log(text);
    this.setState({ test: text });
  }

  async componentDidMount() {
    const socket = socketIOClient();
    this.state.socket = socket;
    await this.init();

    socket.on("server_update", msg => {
      alert("received update from server" + msg);
    });

    // console.log("done changing test");
    socket.on("test", async msg => {
      console.log("test event received");
      // await this.init();
    });
    socket.emit("test");
    // NB: this works but the await fetch line below is very strange
    // if we move it above console.log("done changing test"), everything breaks
    // committing this for safety, but we're going to try using server-client emitting
    // await fetch(`/change_test`); // should still render 5
    // wait on socket emit event, when that happens, call init again, which will set state again
  }


  handleChange(event) {
    this.setState({trade_command: event.target.value});
  }

  handleSubmit(event) {
    alert('A command was submitted: ' + this.state.trade_command);
    event.preventDefault();

    this.state.socket.emit("client_command", this.state.trade_command);
  }


  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div id="players">
            <Player id="0" />
            <Player id="1" />
            <Player id="2" />
            <Player id="3" />
          </div>

          <Market />

          <form onSubmit={this.handleSubmit}>
            <label>
              Trade: 
              <input type="text" value={this.state.trade_command} onChange={this.handleChange} />
            </label>
            <input type="submit" value="Submit" />
          </form>
        </header>

        <p>This is a test by Felix: {this.state.test}</p>


      </div>
    );
  }
}

export default App;
