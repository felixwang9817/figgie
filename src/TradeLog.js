import React from "react";
import { ListGroup } from "react-bootstrap";


class TradeLog extends React.Component {
  render() {
    let tradeLog = this.props.tradeLog;
    if (!tradeLog) {
      return "";
    }

    return (
      <div id="tradeLog">
        <h2>Trade Log</h2>

        <ListGroup variant="flush">
          {Object.values(tradeLog).map(trade => {
            // hack for showing end-game msgs in a different color
            let variant = trade.substring(0, 4) === "goal" ? "primary" : "";
            return <ListGroup.Item variant={variant}>{trade}</ListGroup.Item>;
          })}
        </ListGroup>
      </div>
    );
  }
}

export default TradeLog;