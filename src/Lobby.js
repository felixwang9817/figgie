import React from "react";
import {
  Form,
  Button,
  Card,
  Container,
  Col,
  Row,
  Table
} from "react-bootstrap";
import Leaderboard from "./Leaderboard";
import { Redirect } from "react-router-dom";
import { server } from "./consts";

class Lobby extends React.Component {
  constructor() {
    super();

    this.numSeconds = 5;

    this.state = { validated: false, rooms: [] };

    this.handleChangeRoom = this.handleChangeRoom.bind(this);
    this.handleEnterRoomForm = this.handleEnterRoomForm.bind(this);
  }

  componentDidMount() {
    this.setState({ user: this.props.user });
    this.updateRooms();
    setInterval(_ => this.updateRooms(), this.numSeconds * 1000);
  }

  handleChangeRoom(event) {
    this.setState({ roomNumber: event.target.value });
  }

  updateRooms() {
    fetch(server + "/rooms", {})
      .then(response => response.json())
      .then(response => {
        this.setState({ rooms: response });
      });
  }

  handleEnterRoomButton(roomNumber) {
    this.setState({ roomNumber: roomNumber }, _ => {
      this.handleEnterRoom();
    });
  }

  handleEnterRoomForm(event) {
    event.preventDefault();
    this.setState({ validated: true }); // this just triggers green/red UI
    // it doesn't mean the form passed validation

    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      return;
    }

    this.handleEnterRoom();
  }

  handleEnterRoom() {
    fetch(server + "/enterRoom", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      method: "POST",
      credentials: "include", // include cookies on RECEIVE (must be here for browser to process SET-COOKIE response header)
      body: JSON.stringify({
        roomNumber: this.state.roomNumber
      })
    }).then(_ => {
      this.setState({ redirect: true });
    });

    // updates roomNumber at Gateway level
    this.props.onEnterRoom(this.state.roomNumber);
  }

  async handleLogout() {
    fetch(server + "/logout", { credentials: "include" });
    this.setState({ user: null });
    this.props.handleLogout(); // to ensure logged out at Gateway level
  }

  render() {
    if (this.state.redirect) {
      return <Redirect to="/play" />;
    }

    return (
      <header className="Lobby-header">
        <Container>
          <Row className="justify-content-md-center">
            <Col xs sm md lg xl={3}></Col>
            <Col xs sm md lg xl="auto" className="text-center">
              <h1>Figgie</h1>
            </Col>
            <Col xs sm md lg xl={3}></Col>
          </Row>
          <Row>
            <Col xs={4}>
              {/* <a
                className="App-link"
                href="https://www.janestreet.com/figgie/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Full Game Rules
              </a> */}
              <Card id="userInfoFormCard" bg="dark" className="text-center">
                {this.state.user ? (
                  <Card.Body>
                    <Card.Title>{this.state.user.username}</Card.Title>
                    <Card.Subtitle>
                      money: {this.state.user.money}
                    </Card.Subtitle>
                    <Card.Text>
                      <p></p>
                    </Card.Text>
                    <Button
                      onClick={_ => this.handleLogout()}
                      variant="secondary"
                    >
                      Log out
                    </Button>
                  </Card.Body>
                ) : (
                  <Card.Body>
                    <Card.Title>Welcome, guest</Card.Title>
                    <Button href="/login" variant="secondary">
                      Log in
                    </Button>{" "}
                    <Button href="/signup" variant="secondary">
                      Sign up
                    </Button>
                  </Card.Body>
                )}
              </Card>
              <Leaderboard />
            </Col>
            <Col xs={8}>
              {this.state.user && (
                <Card id="roomListCard" bg="dark">
                  <Row className="justify-content-md-center">
                    <Col md="auto">
                      <h2>Rooms</h2>
                      <div>
                        {Object.keys(this.state.rooms).length > 0 ? (
                          <Table
                            striped
                            bordered
                            hover
                            size="sm"
                            variant="dark"
                            className="roomListTable"
                          >
                            <thead>
                              <tr>
                                <td>Title</td>
                                <td>Players</td>
                                <td>Action</td>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.keys(this.state.rooms).map(key => (
                                <tr>
                                  <td>{key}</td>
                                  <td>
                                    {Object.keys(
                                      this.state.rooms[key]["playerState"]
                                    ).length + "/4"}
                                  </td>
                                  <td>
                                    <Button
                                      onClick={_ =>
                                        this.handleEnterRoomButton(key)
                                      }
                                    >
                                      Join
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : (
                          "no active rooms"
                        )}
                      </div>
                    </Col>
                  </Row>
                </Card>
              )}
              {this.state.user ? (
                <Card id="enterRoomCard" bg="dark">
                  {alert}
                  <h3>Enter Room</h3>
                  <p>
                    <small>Enter a room to start playing.</small>
                  </p>
                  <Form
                    noValidate
                    validated={this.state.validated}
                    id="enterRoomForm"
                    onSubmit={this.handleEnterRoomForm}
                  >
                    <Form.Group>
                      <Form.Control
                        type="text"
                        value={this.state.roomNumber || ""}
                        placeholder="Room number"
                        onChange={this.handleChangeRoom}
                        autoFocus={true}
                        maxLength={30}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        Please choose a room.
                      </Form.Control.Feedback>
                    </Form.Group>
                    <Button variant="primary" type="submit" block>
                      Enter room
                    </Button>
                  </Form>
                </Card>
              ) : (
                <Row className="justify-content-md-center red">
                  <span>Log in to join a room!</span>
                </Row>
              )}
            </Col>
          </Row>
        </Container>
      </header>
    );
  }
}

export default Lobby;
