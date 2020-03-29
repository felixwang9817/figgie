import React from "react";
import {
  GiTwoCoins,
  GiSandsOfTime
} from "react-icons/gi";
import { playerColor } from "./consts";


class UserInfo extends React.Component {
  constructor() {
    super();
    this.state = { time: Date.now() };
  }

  componentDidMount() {
    this.interval = setInterval(
      () => this.setState({ time: Date.now() }),
      1000
    );
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    if (!this.props.username) {
      return "";
    }

    function formatDate(ms) {
      if (ms < 0) {
        return "0:00";
      }
      let minutes = Math.floor(ms / 60000);
      let seconds = Math.floor((ms - 60000 * minutes) / 1000);
      return (
        <span id="timer">
          {minutes}:{seconds} <GiSandsOfTime />
        </span>
      );
    }

    // TODO: fix money ??? for observers
    let userState = this.props.playerState[this.props.username];
    return (
      <div style={{ color: playerColor }}>
        {this.props.gameTimeEnd &&
          formatDate(this.props.gameTimeEnd - this.state.time)}
        {this.props.username}
        <GiTwoCoins style={{ margin: "0px 8px" }} />
        {userState != null ? userState["money"] : "???"}, room{" "} 
        {this.props.roomNumber}
        <span id="logoutText" onClick={this.props.returnToLobby}>  
          Return to Lobby  
        </span>
      </div>
    );
  }
}

export default UserInfo;