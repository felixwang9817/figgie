import React from "react";
import { Form, Button, Card, Alert } from "react-bootstrap";
import { Redirect } from "react-router-dom";
import server from "./index";

class Signup extends React.Component {
  constructor() {
    super();

    this.state = { validated: false };

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
    this.setState({ validated: true }); // this just triggers green/red UI
    // it doesn't mean the form passed validation

    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      return;
    }

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
        console.log("signup.js receiving response", res);

        this.setState(res);
        // window.setTimeout(() => {
        //   this.setState({ msg: "" });
        // }, 5000);
      })
      .catch(err => {
        console.log(err);
        this.setState({ success: false, msg: "An unknown error occured." });
      });
  }

  render() {
    if (this.state.success) {
      return <Redirect to="/" />;
    }

    let alert = "";
    if (this.state.msg) {
      alert = <Alert variant="warning"> {this.state.msg} </Alert>;
    }

    return (
      <Card id="loginSignupFormCard">
        {alert}
        <h2>Signup</h2>

        <Form
          noValidate
          validated={this.state.validated}
          id="loginSignupForm"
          onSubmit={this.handleSubmitSignup}
        >
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
              Please choose a username (max 30 characters).
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
              Please choose a password (max 30 characters).
            </Form.Control.Feedback>
          </Form.Group>
          <Button variant="primary" type="submit">
            Submit
          </Button>
        </Form>
        <a className="footerRedirect" href="/login">
          Login
        </a>
      </Card>
    );
  }
}

export default Signup;
