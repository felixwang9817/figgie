import React from "react";
import ReactGA from "react-ga";
import { Form, Button, Card, Alert } from "react-bootstrap";
import { Redirect } from "react-router-dom";
import { server } from "./consts";

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

    ReactGA.event({
      category: "Signup",
      action: "Signup attempt by " + this.state.username
    });

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
        if (this.state.success) {
          this.props.onSignup();
        }
      })
      .catch(err => {
        console.log(err);
        this.setState({ success: false, msg: "An unknown error occured." });
      });
  }

  render() {
    if (this.state.success) {
      return <Redirect to="/login" />;
    }

    let alert = "";
    if (this.state.msg) {
      alert = <Alert variant="warning"> {this.state.msg} </Alert>;
    }

    return (
      <header className="Signup-header">
        <Card id="loginSignupFormCard" bg="dark">
          {alert}
          <h3>Figgie</h3>
          <p></p>
          <Form
            noValidate
            validated={this.state.validated}
            id="loginSignupForm"
            onSubmit={this.handleSubmitSignup}
          >
            <Form.Group>
              <Form.Control
                type="text"
                value={this.state.username || ""}
                placeholder="Username"
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
              <Form.Control
                type="password"
                value={this.state.password || ""}
                placeholder="Password"
                onChange={this.handleChangePassword}
                maxLength={30}
                required
              />
              <Form.Control.Feedback type="invalid">
                Please choose a password (max 30 characters).
              </Form.Control.Feedback>
            </Form.Group>
            <Button variant="primary" type="submit" block>
              Sign up
            </Button>
          </Form>
        </Card>
        <Card id="signupFormCard" bg="dark">
          <p className="signupParagraph">
            {"Already have an account? "}
            <a className="footerRedirect" href="/login">
              Log in
            </a>
          </p>
        </Card>
      </header>
    );
  }
}

export default Signup;
