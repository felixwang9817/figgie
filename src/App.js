import React, { Component, useState } from "react";
import socketIOClient from "socket.io-client";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Gateway from "./Gateway.js";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {
  Collapse,
  Button,
  Card,
  ListGroup,
  Alert,
  Table,
  Form,
  Tabs,
  Tab
} from "react-bootstrap";
import {
  GiSpades,
  GiClubs,
  GiDiamonds,
  GiHearts,
  GiTwoCoins
} from "react-icons/gi";
import server from "./index.js";
const playerColor = "yellow";
const disconnectedColor = "gray";
const goalColor = "green";

function displaySuit(suit) {
  let icon = null;
  let color = null;
  switch (suit) {
    case "clubs":
      color = "lightgray";
      icon = <GiClubs />;
      break;
    case "spades":
      color = "lightgray";
      icon = <GiSpades />;
      break;
    case "diamonds":
      color = "red";
      icon = <GiDiamonds />;
      break;
    case "hearts":
      color = "red";
      icon = <GiHearts />;
      break;
    default:
  }
  return (
    <span style={{ color: color }}>
      {suit} {icon}
    </span>
  );
}

class Players extends React.Component {
  render() {
    let msg = "";
    let playerState = this.props.playerState;
    let username = this.props.username;

    if (username == null) return "";
    if (playerState[username] == null) return "";

    let numPlayers = Object.keys(playerState).length;
    if (numPlayers < 4) {
      msg = "Waiting for players " + numPlayers + "/4...";
    } else {
      msg = this.props.isGameActive
        ? "Game On. Enter 'end' to stop"
        : "Enter 'start'";
    }

    // fill players up to four names
    let players = Object.keys(playerState);
    while (players.length < 4) {
      players.push("asdf");
    }

    return (
      <div>
        <Table striped bordered hover variant="dark">
          <thead>
            <tr>
              <td>#</td>
              {Object.keys(players).map(key =>
                playerState[players[key]] != null ? (
                  <td
                    key={key}
                    style={
                      players[key] === username
                        ? { color: playerColor }
                        : playerState[players[key]]["connected"] === false
                        ? { color: disconnectedColor }
                        : {}
                    }
                  >
                    {players[key]}
                  </td>
                ) : (
                  <td key={key}></td>
                )
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{this.props.isGameActive ? "# cards" : "Ready?"} </td>
              {Object.keys(players).map(key =>
                playerState[players[key]] != null ? (
                  <td
                    key={key}
                    style={
                      players[key] === username
                        ? { color: playerColor }
                        : playerState[players[key]]["connected"] === false
                        ? { color: disconnectedColor }
                        : {}
                    }
                  >
                    {this.props.isGameActive
                     ? playerState[players[key]]["numCards"]
                     : playerState[players[key]]["ready"]
                       ? "Ready" : "" }
                  </td>
                ) : (
                  <td key={key}></td>
                )
              )}
            </tr>
          </tbody>
        </Table>
        {msg}
      </div>
    );
  }
}

class Market extends React.Component {
  render() {
    let markets = this.props.marketState;
    let username = this.props.username;
    if (!markets) {
      return "";
    }

    return (
      <Table striped bordered hover variant="dark">
        <thead>
          <tr>
            <th>MARKET</th>
            {Object.keys(markets).map(key => (
              <td key={key}>{displaySuit(key)}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>bids</td>
            {Object.keys(markets).map(key => (
              <td key={key}>
                {markets[key]["bid"] !== null
                  ? markets[key]["bid"] + " by " + markets[key]["bidPlayer"]
                  : ""}
              </td>
            ))}
          </tr>
          <tr>
            <td>offers</td>
            {Object.keys(markets).map(key => (
              <td key={key}>
                {markets[key]["offer"] !== null
                  ? markets[key]["offer"] + " by " + markets[key]["offerPlayer"]
                  : ""}
              </td>
            ))}
          </tr>
          {this.props.isGameActive ? (
            <tr>
              <td># you have</td>
              {Object.keys(markets).map(key => (
                <td key={key}>
                  {this.props.playerState[username] != null
                    ? this.props.playerState[username][key]
                    : ""}
                </td>
              ))}
            </tr>
          ) : (
            <tr></tr>
          )}
          {/* Displaying everyone's cards at end of the game */}
          {!this.props.isGameActive && this.props.tradeLog.length > 0 ? (
            Object.keys(this.props.playerState).map(player => (
              <tr style={player === username ? { color: playerColor } : {}}>
                <td>{player === username ? "you" : "player " + player}</td>
                {Object.keys(markets).map(key => (
                  <td
                    key={key}
                    style={
                      key === this.props.goalSuit
                        ? { color: goalColor, fontWeight: "bold" }
                        : {}
                    }
                  >
                    {this.props.playerState[player] != null
                      ? this.props.playerState[player][key]
                      : ""}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr></tr>
          )}
        </tbody>
      </Table>
    );
  }
}

class TradeLog extends React.Component {
  render() {
    let tradeLog = this.props.tradeLog;
    if (!tradeLog) {
      return "";
    }

    return (
      <div id="tradeLog">
        <h2>Trade Log</h2>

        <ListGroup variant="flush">
          {Object.values(tradeLog).map(trade => {
            // hack for showing end-game msgs in a different color
            let variant = trade.substring(0, 4) === "goal" ? "primary" : "";
            return <ListGroup.Item variant={variant}>{trade}</ListGroup.Item>;
          })}
        </ListGroup>
      </div>
    );
  }
}

class UserInfo extends React.Component {
  render() {
    if (!this.props.username) {
      return "";
    }
    let userState = this.props.playerState[this.props.username];
    return (
      <div style={{ color: playerColor }}>
        {this.props.username}
        <GiTwoCoins style={{ margin: "0px 8px" }} />
        {userState != null ? userState["money"] : "???"}, room{" "}
        {this.props.roomNumber}
        <span id="logoutText" onClick={this.props.handleLogout}>
          Logout
        </span>
      </div>
    );
  }
}

function CheatSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Card id="CheatSheet">
      <Button
        onClick={() => setOpen(!open)}
        aria-controls="rulesCheatSheetText"
        aria-expanded={open}
      >
        {open ? "Close" : "Open"} Trading Cheatsheet
      </Button>
      <Collapse in={open}>
        <div id="rulesCheatSheetText">
          <Tabs defaultActiveKey="basic">
            <Tab eventKey="basic" title="Basic">
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <span>start</span> to start. Market clears after every trade.
                </ListGroup.Item>
                <ListGroup.Item>
                  <span>SUIT at X</span> to make an offer, e.g.{" "}
                  <span>spades at 10</span>
                </ListGroup.Item>
                <ListGroup.Item>
                  <span>X bid for SUIT</span> to make a bid, e.g.{" "}
                  <span>5 bid for hearts</span>
                </ListGroup.Item>
                <ListGroup.Item>
                  <span>take clubs</span> to buy clubs at current offer.
                </ListGroup.Item>
                <ListGroup.Item>
                  <span>sell diamonds</span> to sell diamonds.
                </ListGroup.Item>
                <ListGroup.Item>
                  <span>clear</span> or <span>out</span> to clear all your bids
                  and offers.
                </ListGroup.Item>
              </ListGroup>
            </Tab>
            <Tab eventKey="advanced" title="Advanced">
              <ListGroup variant="flush">
                <ListGroup.Item>
                  All trading commands can be referred by their first letter.
                  <span> c s h d</span> for the four suits.
                </ListGroup.Item>
                <ListGroup.Item>
                  <span>h a 15</span> offers hearts at 15. Someone can then
                  enter <span>t h</span> for <span>take hearts</span>.
                </ListGroup.Item>
                <ListGroup.Item>
                  <span>4 b f s</span> is <span>4 bid for spades</span>.
                </ListGroup.Item>
                <ListGroup.Item>
                  <span>c</span> or <span>o</span> to clear.
                </ListGroup.Item>
              </ListGroup>
            </Tab>
          </Tabs>
        </div>
      </Collapse>
    </Card>
  );
}

class App extends Component {
  constructor() {
    super();

    this.state = {
      trade_command: "",
      username: "",
      roomNumber: "1",
      market: {},
      players: {},
      tradeLog: [],
      observer: false,
      isGameActive: false,
      alertMsg: "",
      alertVisible: true,
      goalSuit: null
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleLogout() {
    fetch(server + "/logout", { credentials: "include" });
    this.state.socket.disconnect();
    this.setState({ username: null });
  }

  async componentDidMount() {
    const socket = socketIOClient(server);
    this.state.socket = socket;
    // TODO: authenticate socket, wait for server to signal us our
    // username & roomnumber!!
    // Make it so we don't send anything except req.user through passport,
    // TODO: get username and room number form this.props.user
    // Remove socket.emit enterRoom/provideUsername

    this.setState({ username: this.props.user.username });
    this.setState({ roomNumber: this.props.user.roomNumber });

    socket.on("marketUpdate", state => {
      console.log("market update: ", state);
      this.setState({ market: state });
    });

    socket.on("playerUpdate", state => {
      console.log("player update: ", state);
      this.setState({ players: state });
    });

    socket.on("tradeLogUpdate", state => {
      console.log("trade log update");
      this.setState({ tradeLog: state });
    });

    socket.on("goalSuit", goalSuit => {
      this.setState({ goalSuit: goalSuit });
    });

    socket.on("maxCapacity", () => {
      console.log("Connection rejected since server is at maximum capacity.");
      this.setState({ observer: true });
      // TODO: actually keep connection alive for observers and show them
      // true game state but disable commands
    });

    socket.on("gameStateUpdate", state => {
      console.log("gameStateUpdate: ", state);
      this.setState({ isGameActive: state });
    });

    socket.on("alert", msg => {
      if (!msg) return;
      this.setState({ alertMsg: msg }, () => {
        window.setTimeout(() => {
          this.setState({ alertMsg: "" });
        }, 5000);
      });
    });
  }

  handleChange(event) {
    this.setState({ trade_command: event.target.value });
  }

  handleSubmit(event) {
    event.preventDefault();

    this.state.socket.emit("clientCommand", this.state.trade_command);
    this.setState({ trade_command: "" }); // clear form
  }

  render() {
    if (!this.props.user || !this.state.username) {
      return <Gateway />;
    }

    if (this.state.observer) {
      return (
        <div className="FullGame">
          Game Full. Please wait for players to leave and refresh.
        </div>
      );
    }

    let alert = "";
    if (this.state.alertMsg) {
      alert = <Alert variant="warning"> {this.state.alertMsg} </Alert>;
    }

    let currPlayerState = this.state.players[this.state.username];
    let placeholderString = this.state.isGameActive 
                            ? "Enter trades here!"
                            : currPlayerState && currPlayerState.ready
                              ? "Enter <start>!" 
                              : "Enter <ready> when you're ready!"

    return (
      // TODO: ensure that username is capped at 30 characters or overflow is disabled
      <div className="App">
        <header className="App-header">
          <Row className="gameRow">
            <Col xs={7}>
              <UserInfo
                username={this.state.username}
                playerState={this.state.players}
                roomNumber={this.state.roomNumber}
                handleLogout={() => this.handleLogout()}
              />

              <br></br>

              <Market
                username={this.state.username}
                playerState={this.state.players}
                marketState={this.state["market"]}
                isGameActive={this.state.isGameActive}
                tradeLog={this.state.tradeLog}
                goalSuit={this.state.goalSuit}
              />

              {alert}

              <Form
                inline
                className="justify-content-md-center"
                onSubmit={this.handleSubmit}
              >
                <Form.Group className="tradeCommandForm">
                  <Form.Control
                    type="text"
                    name="trade"
                    value={this.state.trade_command}
                    placeholder={placeholderString}
                    onChange={this.handleChange}
                    autoFocus={true}
                  />
                  <Button variant="primary" type="submit">
                    Submit
                  </Button>
                </Form.Group>
              </Form>

              <br></br>

              <Players
                username={this.state.username}
                playerState={this.state.players}
                isGameActive={this.state.isGameActive}
              />

              <a
                className="App-link"
                href="https://www.janestreet.com/figgie/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Full Game Rules
              </a>
            </Col>

            <Col xs={5}>
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
