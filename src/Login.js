import React from "react";
import { Form, Button, Card } from "react-bootstrap";
import Gateway from "./Gateway";

// TODO: can we unify a single `server` variable across different .js files?
var server;
if (process.env.NODE_ENV === "production") {
  server = "http://3.136.26.146:8080";
} else {
  server = "http://localhost:8080";
}

class Login extends React.Component {
  constructor() {
    super();

    this.state = {};

    this.handleChangeUsername = this.handleChangeUsername.bind(this);
    this.handleChangePassword = this.handleChangePassword.bind(this);
    this.handleChangeRoom = this.handleChangeRoom.bind(this);
    this.handleSubmitLogin = this.handleSubmitLogin.bind(this);
  }

  handleChangeUsername(event) {
    this.setState({ username: event.target.value });
  }

  handleChangePassword(event) {
    this.setState({ password: event.target.value });
  }

  handleChangeRoom(event) {
    this.setState({ roomNumber: event.target.value });
  }

  async handleSubmitLogin(event) {
    event.preventDefault();

    fetch(server + "/login", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      method: "POST",
      credentials: "include", // include cookies on RECEIVE (must be here for browser to process SET-COOKIE response header)
      body: JSON.stringify({
        username: this.state.username,
        password: this.state.password,
        roomNumber: this.state.roomNumber
      })
    })
      .then(response => response.json())
      .then(user => {
        this.setState({ user: user });
        console.log("login.js setting this.state.user: ", user);
      })
      .catch(err => {
        console.log(err);
        this.setState({ user: null });
      });
  }

  render() {
    if (this.state.user) {
      return <Gateway user={this.state.user} />;
    }

    return (
      <Card id="loginSignupFormCard">
        <h2>Login</h2>
        <Form id="loginSignupForm" onSubmit={this.handleSubmitLogin}>
          <Form.Group>
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={this.state.username || ""}
              placeholder="Enter username"
              onChange={this.handleChangeUsername}
              autoFocus={true}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={this.state.password || ""}
              placeholder="Enter password"
              onChange={this.handleChangePassword}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Room</Form.Label>
            <Form.Control
              type="text"
              value={this.state.roomNumber || ""}
              placeholder="Enter Room"
              onChange={this.handleChangeRoom}
            />
          </Form.Group>
          <Button variant="primary" type="submit">
            Submit
          </Button>
        </Form>
        <a href="/signup">Sign Up</a>
      </Card>
    );
  }
}

export default Login;
