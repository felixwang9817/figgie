import React, { Component, useState } from "react";
import socketIOClient from "socket.io-client";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Redirect } from "react-router-dom";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {
  Collapse,
  Button,
  Card,
  Alert,
  ListGroup,
  Form,
  Tabs,
  Tab
} from "react-bootstrap";
import { server } from "./consts";
import Players from "./Player";
import Market from "./Market";
import UserInfo from "./UserInfo";
import TradeLog from "./TradeLog";


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
      gameTimeEnd: null,
      alertMsg: "",
      alertVisible: true,
      goalSuit: null
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.returnToLobby = this.returnToLobby.bind(this);
  }

  // state must be set before render to prevent redirect to /
  async componentWillMount() {
    this.setState({ username: this.props.user.username });
    this.setState({ roomNumber: this.props.user.roomNumber });
  }

  async componentDidMount() {
    const socket = socketIOClient(server);
    this.state.socket = socket;

    // TODO: fix bug where refreshing makes room number disappear
    // fix: query server for room number upon refresh

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

    socket.on("gameTimeEnd", state => {
      this.setState({ gameTimeEnd: state });
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

  returnToLobby() {
    this.setState({username: null}); // triggers redirect
  }

  render() {
    if (!this.props.user || !this.state.username) {
      return <Redirect to="/" />;
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
      ? "Waiting for all players to be ready..."
      : "Enter <ready> when you're ready!";

    return (
      <div className="App">
        <header className="App-header">
          <Row className="gameRow">
            <Col xs={7}>
              <UserInfo
                username={this.state.username}
                playerState={this.state.players}
                roomNumber={this.state.roomNumber}
                gameTimeEnd={this.state.gameTimeEnd}
                returnToLobby={() => this.returnToLobby()}
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
