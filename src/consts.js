export const playerColor = "yellow";
export const disconnectedColor = "gray";
export const goalColor = "green";
export const defaultTextColor = "white";

export const server =
  process.env.NODE_ENV === "production"
    ? "http://figgie.io:8080"
    : "http://localhost:8080";
