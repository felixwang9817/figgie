import React from "react";
import {
  Table
} from "react-bootstrap";
import {
  GiSpades,
  GiClubs,
  GiDiamonds,
  GiHearts,
  GiTwoCoins,
} from "react-icons/gi";
import { playerColor, goalColor } from "./consts";


function displaySuit(suit) {
  let icon = null;
  let color = null;
  switch (suit) {
    case "clubs":
      color = "lightgray";
      icon = <GiClubs />;
      break;
    case "spades":
      color = "lightgray";
      icon = <GiSpades />;
      break;
    case "diamonds":
      color = "red";
      icon = <GiDiamonds />;
      break;
    case "hearts":
      color = "red";
      icon = <GiHearts />;
      break;
    default:
  }
  return (
    <span style={{ color: color }}>
      {suit} {icon}
    </span>
  );
}

class Market extends React.Component {
  constructor() {
    super();

    this.state = {
      didMarketChange:
      {
        clubs: { bid: false, offer: false },
        spades: { bid: false, offer: false },
        hearts: { bid: false, offer: false },
        diamonds: { bid: false, offer: false }
      }
    }
  }

  componentDidUpdate(prevProps) {
    let markets = this.props.marketState;
    let prevMarkets = prevProps.marketState;
    if (Object.keys(prevMarkets).length === 0) return;
    if (JSON.stringify(markets) === JSON.stringify(prevMarkets)) return;  // no change

    let didMarketChange = {}

    Object.keys(markets).map(key => {
      didMarketChange[key] = {};
      didMarketChange[key]["bid"] = markets[key]["bid"] !== prevMarkets[key]["bid"];
      didMarketChange[key]["offer"] = markets[key]["offer"] !== prevMarkets[key]["offer"];
    })

    console.log(didMarketChange);
    this.setState({ didMarketChange: didMarketChange });
  }


  render() {
    let markets = this.props.marketState;
    let username = this.props.username;
    if (!markets) {
      return "";
    }

    return (
      <Table striped bordered hover variant="dark">
        <thead>
          <tr>
            <th>MARKET</th>
            {Object.keys(markets).map(key => (
              <td key={key}>{displaySuit(key)}</td>
            ))}

            {!this.props.isGameActive && this.props.playerState[username] && 
              this.props.playerState[username]["netGain"] && (
              <td>
                Net Gain <GiTwoCoins />
              </td>
            )}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>bids</td>
            {Object.keys(markets).map(key => (
              <td key={key} className={this.state.didMarketChange[key]["bid"] ? "marketFlash" : ""} >
                {markets[key]["bid"] !== null
                  ? markets[key]["bid"] + " by " + markets[key]["bidPlayer"]
                  : ""}
              </td>
            ))}
          </tr>
          <tr>
            <td>offers</td>
            {Object.keys(markets).map(key => (
              <td key={key} className={this.state.didMarketChange[key]["offer"] ? "marketFlash" : ""}>
                {markets[key]["offer"] !== null
                  ? markets[key]["offer"] + " by " + markets[key]["offerPlayer"]
                  : ""}
              </td>
            ))}
          </tr>
          {this.props.isGameActive ? (
            <tr>
              <td># you have</td>
              {Object.keys(markets).map(key => (
                <td key={key}>
                  {this.props.playerState[username] != null &&
                    this.props.playerState[username][key]}
                </td>
              ))}
            </tr>
          ) : (
            <tr></tr>
          )}
          {/* Displaying everyone's cards at end of the game */}
          {!this.props.isGameActive && this.props.playerState[username] && 
            this.props.playerState[username]["netGain"] &&  
            // netGain not null => was in previous game and should see results
            (Object.keys(this.props.playerState).map(player => (
              <tr style={player === username ? { color: playerColor } : {}}>
                <td>{player === username ? "you" : "player " + player}</td>
                {Object.keys(markets).map(key => (
                  <td
                    key={key}
                    style={
                      key === this.props.goalSuit
                        ? { color: goalColor, fontWeight: "bold" }
                        : {}
                    }
                  >
                    {this.props.playerState[player] != null &&
                      this.props.playerState[player][key]}
                  </td>
                ))}

                <td>{this.props.playerState[player]["netGain"]}</td>
              </tr>
            )))}
        </tbody>
      </Table>
    );
  }
}

export default Market;