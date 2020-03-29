import React from "react";
import { Table, Card } from "react-bootstrap";
import { server } from "./consts";

class Leaderboard extends React.Component {
  constructor() {
    super();

    // TODO: fix bug where removing this leaderboard results in render executing
    // before componentWillMount, thus attempting to iterate through the keys
    // of a non-existent leaderboard, which causes an error
    // NB: this is confusing because componentWillMount should finish executing before render
    this.state = { leaderboard: [{ username: "", money: "" }] };
  }

  async componentDidMount() {
    await fetch(server + "/leaderboard", {})
      .then(response => response.json())
      .then(response => {
        let leaderboard = response.slice(0, 5);
        this.setState({ leaderboard: leaderboard });
      });
  }

  render() {
    return (
      <Card id="leaderboardCard" bg="dark" className="text-center">
        <Card.Body>
          <Card.Title>Leaderboard</Card.Title>
          <Table
            striped
            bordered
            hover
            size="sm"
            variant="dark"
            className="leaderboardTable"
          >
            <thead>
              <tr>
                <td>username</td>
                <td>money</td>
              </tr>
            </thead>
            <tbody>
              {Object.keys(this.state.leaderboard).map(key => (
                <tr key={key}>
                  <td>{this.state.leaderboard[key]["username"]}</td>
                  <td>{this.state.leaderboard[key]["money"]}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  }
}

export default Leaderboard;
