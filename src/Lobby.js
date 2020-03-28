import React from "react";
import { Form, Button, Card, Container, Col, Row } from "react-bootstrap";
import Leaderboard from "./Leaderboard";
import { Redirect } from "react-router-dom";
import { server } from "./consts";

class Lobby extends React.Component {
  constructor() {
    super();

    this.state = { validated: false };

    this.handleChangeRoom = this.handleChangeRoom.bind(this);
    this.handleEnterRoom = this.handleEnterRoom.bind(this);
  }

  componentDidMount() {
    this.setState({ user: this.props.user });
  }

  handleChangeRoom(event) {
    this.setState({ roomNumber: event.target.value });
  }

  async handleEnterRoom(event) {
    event.preventDefault();
    this.setState({ validated: true }); // this just triggers green/red UI
    // it doesn't mean the form passed validation

    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      return;
    }

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
            <Col xs sm md lg xl="auto">
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
              {this.state.user ? (
                <div>
                  <h3>username: {this.state.user.username}</h3>
                  <span id="logoutText" onClick={_ => this.handleLogout()}>
                    Logout
                  </span>
                </div>
              ) : (
                <Card id="userInfoFormCard" bg="dark" className="text-center">
                  <Card.Body>
                    <Card.Title>User Info</Card.Title>
                    <>
                      <Button href="/login" variant="secondary">
                        Log in
                      </Button>{" "}
                      <Button href="/signup" variant="secondary">
                        Sign up
                      </Button>
                    </>
                    {/* <Nav>
                      <Nav.Item>
                        <Nav.Link
                          href="/login"
                          style={{ color: defaultTextColor }}
                        >
                          Login
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link
                          href="/signup"
                          style={{ color: defaultTextColor }}
                        >
                          Signup
                        </Nav.Link>
                      </Nav.Item>
                    </Nav> */}
                  </Card.Body>
                </Card>
              )}
              <Leaderboard />
            </Col>
            <Col xs={8}>
              <Row className="justify-content-md-center">
                <Col md="auto">
                  <h2>Rooms</h2>
                </Col>
              </Row>
              {this.state.user ? (
                <div>
                  <Card id="enterRoomCard">
                    {alert}
                    <h2>Enter Room</h2>
                    <Form
                      noValidate
                      validated={this.state.validated}
                      id="enterRoomForm"
                      onSubmit={this.handleEnterRoom}
                    >
                      <Form.Group>
                        <Form.Label>Room</Form.Label>
                        <Form.Control
                          type="text"
                          value={this.state.roomNumber || ""}
                          placeholder="Enter Room"
                          onChange={this.handleChangeRoom}
                          autoFocus={true}
                          maxLength={30}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          Please choose a room.
                        </Form.Control.Feedback>
                      </Form.Group>
                      <Button variant="primary" type="submit">
                        Submit
                      </Button>
                    </Form>
                  </Card>
                </div>
              ) : (
                <div></div>
              )}
            </Col>
          </Row>
        </Container>
      </header>
    );
  }
}

export default Lobby;
