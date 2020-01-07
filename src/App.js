import React, { Component } from "react";
import socketIOClient from "socket.io-client";
import "./App.css";

var suits = ["hearts", "diamonds", "clubs", "spades"];

class Player extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    var cards = "";
    let playerState = this.props.playerState;
    console.log(this.props);

    suits.forEach(suit => {
      let count = playerState[suit];
      cards += count ? count + " " + suit + " " : "";
    });

    return (
      <div>
        <span class="player_id"> player #{this.props.id} </span>
        {cards}
        <span class="num_cards"> {playerState.num_cards} cards </span>
        <span class="money"> {playerState.money} money </span>
      </div>
    );
  }
}

class Market extends React.Component {
  // constructor(props) {
  //   super(props);
  // }

  render() {
    let markets = this.props.marketState;
    console.log("Market rendering, " + JSON.stringify(markets));
    if (!markets) {
      return '';
    }

    return (
      <div id="market">
        market
        {Object.entries(markets).map(([suit, suit_market]) => (
          <p>
            {suit}: 
            {suit_market["bid"] || " no"} bid
            ({suit_market["bid_player"] || "n/a"}), 
            {suit_market["offer"] || " no"} offer
            ({suit_market["offer_player"] || "n/a"}).
          </p>
        ))}
      </div>
    );
  }
}

class App extends Component {
  constructor() {
    super();

    this.state = {
      trade_command: "",
      market: {},
      players: {}
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  async componentDidMount() {
    const socket = socketIOClient();
    this.state.socket = socket;

    socket.on("market_update", state => {
      console.log("market update");
      console.log(state);
      this.setState({ market: state });
    });

    socket.on("player_update", state => {
      console.log("player update");
      console.log(state);
      this.setState({ players: state });
    });

    socket.on("bad_command", () => {
      console.log("Bad Command");

      // this is a test to show Player props are being updated correctly
      let playerState = { ...this.state.players };
      playerState[0]["diamonds"] = 100;

      this.setState({ players: playerState });
    });
  }

  handleChange(event) {
    this.setState({ trade_command: event.target.value });
  }

  handleSubmit(event) {
    console.log("Sending command to server: " + this.state.trade_command);
    event.preventDefault();

    this.state.socket.emit("client_command", this.state.trade_command);
  }

  render() {
    console.log("state", this.state);
    console.log("app is rendering itself");

    // TODO: use a render market function to force market to re-render when app updates state
    return (
      <div className="App">
        <header className="App-header">
          <div id="players">
            {Object.entries(this.state.players).map(([key, val]) => (
              <Player id={key} playerState={val}></Player>
            ))}
          </div>

          <Market marketState={this.state["market"]} />

          <form onSubmit={this.handleSubmit}>
            <label>
              Trade:
              <input
                type="text"
                value={this.state.trade_command}
                onChange={this.handleChange}
              />
            </label>
            <input type="submit" value="Submit" />
          </form>
        </header>
      </div>
    );
  }
}

export default App;
