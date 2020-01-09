import React from "react";
import queryString from "query-string";

class Room extends React.Component {
  constructor() {
    super();

    this.state = { roomNumber: "" };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({ roomNumber: event.target.value });
  }

  handleSubmit(event) {
    console.log("Navigating to app with room number: " + this.state.roomNumber);
    event.preventDefault();

    this.setState({ roomNumber: "" }); // clear form

    // TODO: retrieve username from querystring
    const values = queryString.parse(this.props.location.search);
    let username = values.username;
    console.log("username from query string: " + username);

    // navigates to app while passing room number as querystring
    let path = `/App?username=${username}&roomNumber=${this.state.roomNumber}`;
    this.props.history.push(path);
  }

  render() {
    return (
      <div>
        <p>login test</p>
        <form class="commandForm" onSubmit={this.handleSubmit}>
          <label>
            Choose your room number:
            <input
              type="text"
              value={this.state.roomNumber}
              onChange={this.handleChange}
            />
          </label>
          <input type="submit" value="Submit" />
        </form>
      </div>
    );
  }
}

export default Room;
