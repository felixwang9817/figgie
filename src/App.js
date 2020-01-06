import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";


class Player extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      diamonds: 2,
      clubs: null,
      hearts: null,
      spades: null,
      num_cards: 10,
      money: 50,
      id: props.id,
    };
  }


  render() {
    var cards = '';

    // TODO: prettify this
    if (this.state.diamonds === null) {
      cards += '';
    } else {
      cards += this.state.diamonds.toString() + ' diamonds '
    }

    if (this.state.clubs === null) {
      cards += '';
    } else {
      cards += this.state.clubs.toString() + ' clubs '
    }

    if (this.state.hearts === null) {
      cards += '';
    } else {
      cards += this.state.hearts.toString() + ' hearts '
    }

    if (this.state.spades === null) {
      cards += '';
    } else {
      cards += this.state.spades.toString() + ' spades '
    }


    return (
      <div>
        <span class='player_id'> player #{this.state.id} </span>
        {cards}
        <span class='num_cards'> {this.state.num_cards} cards </span>
        <span class='money'> {this.state.money} money </span>
      </div>
    );
  }
}


class Market extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bids: {
        clubs: [1, 0],
        spades: [2, 0],
        hearts: [3, 2],
        diamonds: [4, 1],
      },
      offers: {
        clubs: 11,
        spades: 12,
        hearts: 13,
        diamonds: 14,
      },
    };
  }

  render() {
    return (
      <div id='market'>
        market

        {
          Object.keys(this.state.bids).map((key, val) => ( 

            <p> {this.state.bids[key][0]} bid (#{this.state.bids[key][1]})
             for {key}. </p> 
          ))
        }

        {// TODO: offers, display in bidding language?
        }

      </div>
    );
  }
}



class App extends Component {
  state = {
    test: ""
  };

  constructor() {
    super();
  }

  init() {
    fetch(`/sum/3/5`)
      .then(res => res.text())
      .then(res => {
        this.setState({ test: res });
      });
  }

  componentDidMount() {
    this.init();
  }


  render() {
    return (
      <div className="App">
        <header className="App-header">

          <div id='players'>
            <Player id="0" />
            <Player id="1" />
            <Player id="2" />
            <Player id="3" />
          </div>

          <Market />

        </header>

        <p>This is a test by Felix: {this.state.test}</p>
       
      </div>
    
          
    ) 
  }
}

export default App;
