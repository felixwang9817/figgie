import React, { Component } from "react";
import socketIOClient from "socket.io-client";
import logo from "./logo.svg";
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
    let market = this.props.marketState;
    let offers = market["offers"];

    return (
      <div id="market">
        market
        {Object.keys(offers).map((key, val) => (
          <p>
            {" "}
            {offers[key]["offer"]} offer (#
            {offers[key]["player"]}) for {key}.{" "}
          </p>
        ))}
        {
          // TODO: offers, display in bidding language?
        }
      </div>
    );
  }
}

var playerInitState = {
  diamonds: 1,
  clubs: 2,
  hearts: 3,
  spades: 4,
  num_cards: 10,
  money: 50
};

class App extends Component {
  constructor() {
    super();

    this.state = {
      trade_command: "",
      market: {
        bids: {
          clubs: { bid: null, player: null },
          spades: { bid: null, player: null },
          hearts: { bid: null, player: null },
          diamonds: { bid: null, player: null }
        },
        offers: {
          clubs: { offer: null, player: null },
          spades: { offer: null, player: null },
          hearts: { offer: null, player: null },
          diamonds: { offer: null, player: null }
        }
      },
      players: {
        0: { ...playerInitState },
        1: { ...playerInitState },
        2: { ...playerInitState },
        3: { ...playerInitState }
      }
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
            <Player id="0" playerState={this.state["players"][0]} />
            <Player id="1" playerState={this.state["players"][1]} />
            <Player id="2" playerState={this.state["players"][2]} />
            <Player id="3" playerState={this.state["players"][3]} />
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
