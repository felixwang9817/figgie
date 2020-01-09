import React, { Component, useState } from "react";
import socketIOClient from "socket.io-client";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Collapse, Button } from 'react-bootstrap';
import queryString from "query-string";

let suits = ["hearts", "diamonds", "clubs", "spades"];

class Player extends React.Component {
  render() {
    let cards = "";
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
        <span class="numCards"> {playerState.numCards} cards </span>
        <span class="money"> {playerState.money} money </span>
      </div>
    );
  }
}


class Players extends React.Component {


  render () {
    let msg = "";
    let playerState = this.props.playerState;
    let username = this.props.username;

    if (username == null) return '';
    if (playerState[username] == null) return '';

    console.log(playerState);
    console.log(username);
    let numPlayers = Object.keys(playerState).length;
    if (numPlayers < 4) {
      msg = "Waiting for players " + numPlayers + "/4...";
    } else {
      msg = this.props.isGameActive
        ? "Game On. Enter 'end' to stop"
        : "enter 'start'";
    }

    let cards = "";

    suits.forEach(suit => {
      let count = playerState[username][suit];
      cards += count ? count + " " + suit + " " : "";
    });

    
    let yourInfo = (
      <div>
        <span class="player_id"> {username} (you) </span>
        {cards}
        <span class="money"> {playerState[username].money} money </span>
      </div>
    );


    let otherPlayers = (
        <Row>
          {Object.entries(playerState).map(([key, val]) =>
                  key !== username ? (
                      <Col xs={3}>
                        <span class="name">{key}</span>
                        <br />
                        <span class="money">money: {playerState[key]["money"]}</span>
                      </Col>

                  ) : (
                    <div></div>
                  )
          )}

        {/* TODO: add placeholder Col's for missing players*/}

        </Row>
    );

    return (
          <div>

            {yourInfo}

            {otherPlayers}

            {msg}

          </div>
          );
  }
}


class Market extends React.Component {
  render() {
    let markets = this.props.marketState;
    console.log("Market rendering, " + JSON.stringify(markets));
    if (!markets) {
      return "";
    }

    return (
      <div id="market">
        <h2> Market </h2>
        {Object.entries(markets).map(([suit, suit_market]) => (
          <p>
            {suit}:{suit_market["bid"] || " no"} bid (
            {suit_market["bidPlayer"] || "n/a"}),
            {suit_market["offer"] || " no"} offer (
            {suit_market["offerPlayer"] || "n/a"}).
          </p>
        ))}
      </div>
    );
  }
}

class TradeLog extends React.Component {
  render() {
    let tradeLog = this.props.tradeLog;
    console.log("Trade log rendering, " + JSON.stringify(tradeLog));
    if (!tradeLog) {
      return "";
    }

    return (
      <div id="tradeLog">
        <h2>Trade Log</h2>
        {Object.values(tradeLog).map(trade => (
          <p>{trade}</p>
        ))}
      </div>
    );
  }
}

function CheatSheet() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button
        onClick={() => setOpen(!open)}
        aria-controls="example-collapse-text"
        aria-expanded={open}
      >
        click
      </Button>
      <Collapse in={open}>
        <div id="example-collapse-text">
          Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus
          terry richardson ad squid. Nihil anim keffiyeh helvetica, craft beer
          labore wes anderson cred nesciunt sapiente ea proident.
        </div>
      </Collapse>
    </div>
  );
}

class App extends Component {
  constructor() {
    super();

    this.state = {
      trade_command: "",
      username: "",
      roomNumber: "",
      market: {},
      players: {},
      tradeLog: [],
      observer: false,
      isGameActive: false
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  async componentDidMount() {
    // TODO: make sure can't take a username that's already taken
    // retrieve username from querystring
    const values = queryString.parse(this.props.location.search);
    let username = values.username;
    let roomNumber = values.roomNumber;
    console.log("username from query string: " + username);
    console.log("room number from query string: " + roomNumber);
    if (username == null || roomNumber == null) {
      // for now, if no username or no room number, set to observer
      this.setState({ observer: true });
    }

    const socket = socketIOClient();
    socket.emit("enterRoom", roomNumber);
    this.state.socket = socket;

    socket.on("enteredRoom", state => {
      console.log("entered room number: " + state);
      // to ensure that no async problems occur with username being set up after the room
      socket.emit("provideUsername", username);
      this.setState({ roomNumber: state });
    });

    socket.on("marketUpdate", state => {
      console.log("market update");
      console.log(state);
      this.setState({ market: state });
    });

    socket.on("playerUpdate", state => {
      console.log("player update");
      console.log(state);
      this.setState({ players: state });
    });

    socket.on("tradeLogUpdate", state => {
      console.log("trade log update");
      console.log(state);
      this.setState({ tradeLog: state });
    });

    socket.on("username", state => {
      console.log("username");
      console.log(state);
      this.setState({ username: state });
    });

    socket.on("maxCapacity", () => {
      console.log("Connection rejected since server is at maximum capacity.");
      this.setState({ observer: true });
      // TODO: actually keep connection alive for observers and show them
      // true game state but disable commands
    });

    socket.on("gameStateUpdate", state => {
      this.setState({ isGameActive: state });
    });
  }

  handleChange(event) {
    this.setState({ trade_command: event.target.value });
  }

  handleSubmit(event) {
    console.log("Sending command to server: " + this.state.trade_command);
    event.preventDefault();

    this.state.socket.emit("clientCommand", this.state.trade_command);
    this.setState({ trade_command: "" }); // clear form
  }

  render() {
    console.log("state", this.state);
    console.log("app is rendering itself");

    if (this.state.observer) {
      return (
        <div className="FullGame">
          Game Full. Please wait for players to leave and refresh.
        </div>
      );
    }

    return (
      <div className="App">
        <header className="App-header">
          <Row>
            <Col xs={8}>
              <div class="roomNumber">room: {this.state.roomNumber}</div>

              <Market marketState={this.state["market"]} />

              <form class="commandForm" onSubmit={this.handleSubmit}>
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

              <Players username={this.state.username} playerState={this.state.players} 
                      isGameActive={this.state.isGameActive} />


              <a class="App-link" href="rules.html">
                Rules
              </a>

            </Col>


            <Col xs={4}>
              <CheatSheet />

              <TradeLog tradeLog={this.state["tradeLog"]} />
            </Col>
          </Row>
        </header>
      </div>
    );
  }
}

export default App;
