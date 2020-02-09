import React from "react";
import queryString from "query-string";

class Login extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <form action="/login" method="post">
        <div>
          <label>Username:</label>
          <input type="text" name="username" />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" name="password" />
        </div>
        <div>
          <input type="submit" value="Log In" />
        </div>
      </form>
      // <div>
      //   hi
      // </div>
    );
  }
}

export default Login;
