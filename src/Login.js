import React from "react";
import { Form, Button, Card, Alert } from "react-bootstrap";
import Gateway from "./Gateway";
import ReactGA from 'react-ga';
import server from "./index";

class Login extends React.Component {
  constructor() {
    super();

    this.state = {validated: false};

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
    this.setState({validated: true});  // this just triggers green/red UI
    // it doesn't mean the form passed validation

    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      return;
    }

    ReactGA.event({
      category: "Login",
      action: "Login attempt"
    });


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
      .then(res => {
        this.setState(res);
        console.log("login.js setting this.state.user: ", res.user);
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

    let alert = "";
    if (this.state.msg) {
      alert = (<Alert variant="danger"> {this.state.msg} </Alert>);
    }

    return (
      <Card id="loginSignupFormCard">
        {alert}
        <h2>Login</h2>
        <Form noValidate validated={this.state.validated} id="loginSignupForm" onSubmit={this.handleSubmitLogin}>
          <Form.Group>
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={this.state.username || ""}
              placeholder="Enter username"
              onChange={this.handleChangeUsername}
              autoFocus={true}
              maxLength={30}
              required
            />
            <Form.Control.Feedback type="invalid">
              Please enter your username.
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group>
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={this.state.password || ""}
              placeholder="Enter password"
              onChange={this.handleChangePassword}
              maxLength={30}
              required
            />
            <Form.Control.Feedback type="invalid">
              Please enter your password.
            </Form.Control.Feedback>
          </Form.Group>
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
        <a className="footerRedirect" href="/signup">Sign Up</a>
      </Card>
    );
  }
}

export default Login;
