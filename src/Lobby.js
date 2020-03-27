import React from "react";
import {
  Form,
  Button,
  Card,
  Nav,
  Jumbotron,
  Container,
  Col,
  Row
} from "react-bootstrap";
import { Redirect } from "react-router-dom";
import server from "./index";

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
      body: JSON.stringify({
        username: this.state.user.username,
        roomNumber: this.state.roomNumber
      })
    }).then(_ => {
      this.setState({ redirect: true });
    });

    // update this.state.user to reflect roomNumber, which passes roomNumber to App
    let user = this.props.user;
    user["roomNumber"] = this.state.roomNumber;
    this.setState({ user: user });
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
      <Container>
        <Row>
          <Col>
            <Jumbotron>
              <h1>
                username: {this.state.user ? this.state.user.username : "N/A"}
              </h1>
              {this.state.user ? (
                <div>
                  <span id="logoutText" onClick={_ => this.handleLogout()}>
                    Logout
                  </span>
                  <Card id="loginSignupFormCard">
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
                <Nav>
                  <Nav.Item>
                    <Nav.Link href="/login">Login</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link href="/signup">Signup</Nav.Link>
                  </Nav.Item>
                </Nav>
              )}
            </Jumbotron>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default Lobby;
