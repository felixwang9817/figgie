import React, { Component, useState } from "react";
import socketIOClient from "socket.io-client";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {
  Collapse,
  Button,
  Card,
  ListGroup,
  Alert,
  Table,
  Form
} from "react-bootstrap";
import {
  GiSpades,
  GiClubs,
  GiDiamonds,
  GiHearts,
  GiTwoCoins
} from "react-icons/gi";
const playerColor = "yellow";
const goalColor = "green";
const ip = process.env.IP || "localhost"; // REPLACE on production!!

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

    console.log("playerState " + JSON.stringify(playerState));
    console.log(username);
    let numPlayers = Object.keys(playerState).length;
    if (numPlayers < 4) {
      msg = "Waiting for players " + numPlayers + "/4...";
    } else {
      msg = this.props.isGameActive
        ? "Game On. Enter 'end' to stop"
        : "enter 'start'";
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
                    style={
                      players[key] === username ? { color: playerColor } : {}
                    }
                  >
                    {players[key]}
                  </td>
                ) : (
                  <td></td>
                )
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td># cards</td>
              {Object.keys(players).map(key =>
                playerState[players[key]] != null ? (
                  <td
                    style={
                      players[key] === username ? { color: playerColor } : {}
                    }
                  >
                    {playerState[players[key]]["numCards"]}
                  </td>
                ) : (
                  <td></td>
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
              <td>{displaySuit(key)}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>bids</td>
            {Object.values(markets).map(suitMarket => (
              <td>
                {suitMarket["bid"] !== null
                  ? suitMarket["bid"] + " by " + suitMarket["bidPlayer"]
                  : ""}
              </td>
            ))}
          </tr>
          <tr>
            <td>offers</td>
            {Object.values(markets).map(suitMarket => (
              <td>
                {suitMarket["offer"] !== null
                  ? suitMarket["offer"] + " by " + suitMarket["offerPlayer"]
                  : ""}
              </td>
            ))}
          </tr>

          {this.props.isGameActive ? (
            <tr>
              <td># you have</td>
              {Object.keys(markets).map(key => (
                <td>
                  {this.props.playerState[username] != null
                    ? this.props.playerState[username][key]
                    : ""}
                </td>
              ))}
            </tr>
          ) : (
            ""
          )}

          {/* Displaying everyone's cards at end of the game */}
          {!this.props.isGameActive && this.props.tradeLog.length > 0
            ? Object.keys(this.props.playerState).map(player => (
                <tr style={player === username ? { color: playerColor } : {}}>
                  <td>{player === username ? "you" : "player " + player}</td>
                  {Object.keys(markets).map(key => (
                    <td
                      style={
                        key === this.props.goalSuit
                          ? { color: goalColor, "font-weight": "bold" }
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
            : ""}
        </tbody>
      </Table>
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
      </div>
    );
  }
}

// class LoginPage extends React.Component {
//   // TODO: it will have a form, with event handlers passed through props
//   // because the handlers need to update the state of App
//   render() {
//     return (
//       // <form onSubmit={this.handleSubmit}>
//       //   <Form inline className="justify-content-md-center">
//       //     <Form.Group controlId="formBasicPassword">
//       //       <Form.Control
//       //         type="text"
//       //         name="trade"
//       //         value={this.state.trade_command}
//       //         placeholder="Enter trades here!"
//       //         onChange={this.handleChange}
//       //       />
//       //     </Form.Group>
//       //     <Button variant="primary" type="submit">
//       //       Submit
//       //     </Button>
//       //   </Form>
//       // </form>
//       <form onSubmit={this.props.handleSubmitLogin}>
//         <Form>
//           <Form.Group controlId="formBasicEmail">
//             <Form.Label>Username</Form.Label>
//             <Form.Control
//               type="text"
//               placeholder="Enter username"
//               // value={this.props.username}
//               onChange={this.props.handleChangeUsername}
//             />
//           </Form.Group>

//           <Form.Group controlId="formBasicPassword">
//             <Form.Label>Room Number</Form.Label>
//             <Form.Control
//               type="text"
//               placeholder="Enter room number"
//               // value={this.props.roomNumber}
//               onChange={this.props.handleChangeRoomNumber}
//             />
//           </Form.Group>
//           <Button variant="primary" type="submit">
//             Submit
//           </Button>
//         </Form>
//       </form>
//     );
//   }
// }

function CheatSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Card id="CheatSheet">
      <Button
        onClick={() => setOpen(!open)}
        aria-controls="example-collapse-text"
        aria-expanded={open}
      >
        {open ? "Close" : "Open"} Trading Cheatsheet
      </Button>
      <Collapse in={open}>
        <div id="rulesCheatSheetText">
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
              <span>clear</span> or <span>out</span> to clear all your bids and
              offers.
            </ListGroup.Item>
          </ListGroup>
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
      roomNumber: "",
      market: {},
      players: {},
      tradeLog: [],
      observer: false,
      isGameActive: false,
      alertMsg: "",
      alertVisible: true,
      loggedIn: false,
      inRoom: false,
      initialized: false,
      goalSuit: null
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChangeUsername = this.handleChangeUsername.bind(this);
    this.handleChangeRoomNumber = this.handleChangeRoomNumber.bind(this);
    this.handleSubmitLogin = this.handleSubmitLogin.bind(this);
  }

  init(userName, roomNumber) {
    // TODO: do something with username
    this.state.socket.emit("enterRoom", roomNumber);
  }

  async componentDidMount() {
    // TODO: make sure can't take a username that's already taken
    // retrieve username from querystring

    const socket = socketIOClient(ip + ":8080");
    this.state.socket = socket;

    socket.on("enteredRoom", state => {
      console.log("entered room number: " + state);
      // to ensure that no async problems occur with username being set up after the room
      socket.emit("provideUsername", this.state.username);
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

    socket.on("goalSuit", goalSuit => {
      console.log("goalSuit is:", goalSuit);
      this.setState({ goalSuit: goalSuit });
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
    console.log("Sending command to server: " + this.state.trade_command);
    event.preventDefault();

    this.state.socket.emit("clientCommand", this.state.trade_command);
    this.setState({ trade_command: "" }); // clear form
  }

  handleChangeUsername(event) {
    console.log("changing username");
    this.setState({ username: event.target.value });
  }

  handleChangeRoomNumber(event) {
    console.log("changing room number");
    this.setState({ roomNumber: event.target.value });
  }

  async handleSubmitLogin(event) {
    console.log(
      "Logging in with username " +
        this.state.username +
        " and room number " +
        this.state.roomNumber
    );
    event.preventDefault();

    // check if user is already logged in
    let userLoggedIn = await fetch(`/userLoggedIn/${this.state.username}`);
    userLoggedIn = await userLoggedIn.json();
    if (!userLoggedIn) {
      this.setState({ loggedIn: true, inRoom: true });
    } else {
      this.setState({ username: "", roomNumber: "" });
    }
  }

  render() {
    if (!this.state.loggedIn || !this.state.inRoom) {
      return (
        <Card id="loginFormCard">
          <Form id="loginForm" onSubmit={this.handleSubmitLogin}>
            <Form.Group controlId="formBasicPassword">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                name="trade"
                value={this.state.username}
                placeholder="Enter username"
                onChange={this.handleChangeUsername}
              />
            </Form.Group>
            <Form.Group controlId="formBasicPassword">
              <Form.Label>Room Number</Form.Label>
              <Form.Control
                type="text"
                name="trade"
                value={this.state.roomNumber}
                placeholder="Enter room number"
                onChange={this.handleChangeRoomNumber}
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Submit
            </Button>
          </Form>
        </Card>

        // <LoginPage
        //   username={this.state.username}
        //   roomNumber={this.state.roomNumber}
        //   onChangeUsername={this.handleChangeUsername}
        //   onChangeRoomNumber={this.handleChangeRoomNumber}
        //   onSubmitLogin={this.handleSubmitLogin}
        // />
      );
    }

    console.log("username", this.state.username);
    console.log("room number", this.state.roomNumber);

    // check that it has not been initialized yet
    if (!this.state.initialized) {
      this.init(this.state.username, this.state.roomNumber);
      this.setState({ initialized: true });
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

    return (
      // TODO: ensure that username is capped at 30 characters or overflow is disabled
      <div className="App">
        <header className="App-header">
          <Row className="">
            <Col xs={7}>
              <UserInfo
                username={this.state.username}
                playerState={this.state.players}
                roomNumber={this.state.roomNumber}
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

              <form onSubmit={this.handleSubmit}>
                <Form inline className="justify-content-md-center">
                  <Form.Group controlId="formBasicPassword">
                    <Form.Control
                      type="text"
                      name="trade"
                      value={this.state.trade_command}
                      placeholder="Enter trades here!"
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                  <Button variant="primary" type="submit">
                    Submit
                  </Button>
                </Form>
              </form>

              <br></br>

              <Players
                username={this.state.username}
                playerState={this.state.players}
                isGameActive={this.state.isGameActive}
              />

              <a class="App-link" href="rules.html">
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
