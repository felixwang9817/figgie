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
    this.getMarketState = props.getMarketState;
  }

  render() {
    let market = this.getMarketState();
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



class App extends Component {
  constructor() {
    super();

    this.state = {
      trade_command: "",
      market: {
        bids: {
          clubs: { bid: 1, player: 0 },
          spades: { bid: 2, player: 0 },
          hearts: { bid: 8, player: 2 },
          diamonds: { bid: 4, player: 1 }
        },
        offers: {
          clubs: { offer: 0, player: 0 },
          spades: { offer: 0, player: 0 },
          hearts: { offer: 0, player: 0 },
          diamonds: { offer: 0, player: 0 }
        }
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


  getMarketState() {
    return this.state["market"];
  }

  render() {
    console.log("state", this.state);
    console.log("app is rendering itself");
    // TODO: use a render market function to force market to re-render when app updates state
    return (
      <div className="App">
        <header className="App-header">
          <div id="players">
            <Player id="0" />
            <Player id="1" />
            <Player id="2" />
            <Player id="3" />
          </div>

          
          <Market getMarketState={() => this.getMarketState()} />

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
