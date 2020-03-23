import React from "react";
import { Form, Button, Card } from "react-bootstrap";
import { Redirect } from "react-router-dom";

// TODO: can we unify a single `server` variable across different .js files?
var server;
if (process.env.NODE_ENV === "production") {
  server = "http://3.136.26.146:8080";
} else {
  server = "http://localhost:8080";
}

class Signup extends React.Component {
  constructor() {
    super();

    this.state = {};

    this.handleChangeUsername = this.handleChangeUsername.bind(this);
    this.handleChangePassword = this.handleChangePassword.bind(this);
    this.handleSubmitSignup = this.handleSubmitSignup.bind(this);
  }

  handleChangeUsername(event) {
    this.setState({ username: event.target.value });
  }

  handleChangePassword(event) {
    this.setState({ password: event.target.value });
  }

  async handleSubmitSignup(event) {
    event.preventDefault();

    fetch(server + "/signup", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({
        username: this.state.username,
        password: this.state.password
      })
    })
      .then(response => response.json())
      .then(res => {
        this.setState(res);
        console.log("signup.js receiving response", res);
      })
      .catch(err => {
        console.log(err);
        this.setState({ success: false });
      });
  }

  render() {
    if (this.state.success) {
      // if signup successful
      return <Redirect to="/" />;
    }

    return (
      <Card id="loginSignupFormCard">
        <h2>Signup</h2>
        <Form id="loginSignupForm" onSubmit={this.handleSubmitSignup}>
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
          <Button variant="primary" type="submit">
            Submit
          </Button>
        </Form>
        <a href="/">Login</a>
      </Card>
    );
  }
}

export default Signup;
