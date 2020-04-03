import React from "react";
import { Form, Button, Card, Alert } from "react-bootstrap";
import ReactGA from "react-ga";
import { server } from "./consts";
import { Redirect } from "react-router-dom";

class Login extends React.Component {
  constructor() {
    super();

    this.state = { validated: false };

    this.handleChangeUsername = this.handleChangeUsername.bind(this);
    this.handleChangePassword = this.handleChangePassword.bind(this);
    this.handleSubmitLogin = this.handleSubmitLogin.bind(this);
  }

  componentDidMount() {
    console.log(this.props.newUser);
    if (this.props.newUser) {
      this.setState({
        msg: "Signup success! Please log in.",
        msgType: "success"
      });
    }
  }

  handleChangeUsername(event) {
    this.setState({ username: event.target.value });
  }

  handleChangePassword(event) {
    this.setState({ password: event.target.value });
  }

  async handleSubmitLogin(event) {
    event.preventDefault();
    this.setState({ validated: true }); // this just triggers green/red UI
    // it doesn't mean the form passed validation

    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      return;
    }

    ReactGA.event({
      category: "Login",
      action: "Login attempt by " + this.state.username
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
        password: this.state.password
      })
    })
      .then(response => response.json())
      .then(res => {
        this.props.onLogin(res.user);
        if (res.user) { ReactGA.set({ username: res.user.username }); }
        this.setState(res);
        this.setState({ msgType: "danger" });
      })
      .catch(err => {
        console.log(err);
        this.setState({ user: null });
      });
  }

  render() {
    if (this.state.user) {
      return <Redirect to="/" />;
    }

    let alert = "";
    if (this.state.msg) {
      alert = (
        <Alert variant={this.state.msgType || "danger"}>
          {this.state.msg}
        </Alert>
      );
    }

    return (
      <header className="Login-header">
        <Card id="loginSignupFormCard" bg="dark">
          {alert}
          <h3>Figgie</h3>
          <p></p>
          <Form
            noValidate
            validated={this.state.validated}
            id="loginSignupForm"
            onSubmit={this.handleSubmitLogin}
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
                Please enter your username.
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
                Please enter your password.
              </Form.Control.Feedback>
            </Form.Group>
            <Button variant="primary" type="submit" block>
              Log In
            </Button>
          </Form>
        </Card>
        <Card id="signupFormCard" bg="dark">
          <p className="signupParagraph">
            {"Don't have an account? "}
            <a className="footerRedirect" href="/signup">
              Sign up
            </a>
          </p>
        </Card>
      </header>
    );
  }
}

export default Login;
