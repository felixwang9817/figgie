let suits = ["hearts", "diamonds", "clubs", "spades"];

module.exports = {
  otherColor: function(suit) {
    return {
      spades: "clubs",
      clubs: "spades",
      diamonds: "hearts",
      hearts: "diamonds"
    }[suit];
  },
  randomSuit: function() {
    return suits[Math.floor(Math.random() * suits.length)];
  },
  /**
   * Shuffles array in place.
   * @param {Array} a items An array containing the items.
   */
  shuffle: function(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
    return a;
  },
  deepCopy: function(x) {
    return JSON.parse(JSON.stringify(x));
  },
  splitWinnings: function(remainder, numWinners) {
    let remainingRewards = [];
    if (numWinners == 1 || numWinners == 2 || numWinners == 4) {
      for (let i = 0; i < numWinners; i++) {
        remainingRewards.push(remainder / numWinners);
      }
    } else if (numWinners == 3) {
      if (remainder % 3 !== 0) {
        for (let i = 0; i < numWinners; i++) {
          remainingRewards.push(remainder / numWinners);
        }
      } else if (remainder % 3 == 1) {
        remainingRewards.push(Math.floor(remainder / 3));
        remainingRewards.push(Math.floor(remainder / 3));
        remainingRewards.push(Math.floor(remainder / 3) + 1);
      } else if (remainder % 3 == 2) {
        remainingRewards.push(Math.floor(remainder / 3));
        remainingRewards.push(Math.floor(remainder / 3) + 1);
        remainingRewards.push(Math.floor(remainder / 3) + 1);
      }
    }
  }
};
