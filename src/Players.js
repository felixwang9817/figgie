import React from "react";
import {
  Table
} from "react-bootstrap";
import {playerColor, disconnectedColor} from "./consts";


class Players extends React.Component {
  render() {
    let msg = "";
    let playerState = this.props.playerState;
    let username = this.props.username;

    if (username == null) return "";
    if (playerState[username] == null) return "";

    let numPlayers = Object.keys(playerState).length;
    if (numPlayers < 4) {
      msg = "Waiting for players " + numPlayers + "/4...";
    } else {
      msg = this.props.isGameActive
        ? "Game on!"
        : "Game will start when all players are ready!";
    }

    // fill players up to four names
    let players = Object.keys(playerState);
    while (players.length < 4) {
      players.push("asdf");
    }

    return (
      <div>
        <Table striped bordered hover variant="dark">
          <thead>
            <tr>
              <td>#</td>
              {Object.keys(players).map(key =>
                playerState[players[key]] != null ? (
                  <td
                    key={key}
                    style={
                      players[key] === username
                        ? { color: playerColor }
                        : playerState[players[key]]["connected"] === false
                        ? { color: disconnectedColor }
                        : {}
                    }
                  >
                    {players[key]}
                  </td>
                ) : (
                  <td key={key}></td>
                )
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{this.props.isGameActive ? "# cards" : "Ready?"} </td>
              {Object.keys(players).map(key =>
                playerState[players[key]] != null ? (
                  <td
                    key={key}
                    style={
                      players[key] === username
                        ? { color: playerColor }
                        : playerState[players[key]]["connected"] === false
                        ? { color: disconnectedColor }
                        : {}
                    }
                  >
                    {this.props.isGameActive
                      ? playerState[players[key]]["numCards"]
                      : playerState[players[key]]["ready"]
                      ? "Ready"
                      : ""}
                  </td>
                ) : (
                  <td key={key}></td>
                )
              )}
            </tr>
          </tbody>
        </Table>
        {msg}
      </div>
    );
  }
}

export default Players;