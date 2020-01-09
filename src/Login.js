import React from "react";

class Login extends React.Component {
  constructor() {
    super();

    this.state = { username: "" };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({ username: event.target.value });
  }

  handleSubmit(event) {
    console.log("Navigating to app with username: " + this.state.username);
    event.preventDefault();

    this.setState({ username: "" }); // clear form

    // navigates to app while passing username as querystring
    let path = `/App?username=${this.state.username}`;
    this.props.history.push(path);
  }

  render() {
    return (
      <div>
        <p>login test</p>
        <form class="commandForm" onSubmit={this.handleSubmit}>
          <label>
            Choose your username:
            <input
              type="text"
              value={this.state.username}
              onChange={this.handleChange}
            />
          </label>
          <input type="submit" value="Submit" />
        </form>
      </div>
    );
  }
}

export default Login;
