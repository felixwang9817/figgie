export const playerColor = "yellow";
export const disconnectedColor = "gray";
export const goalColor = "green";

export const server = process.env.NODE_ENV === "production"
                      ? "http://3.22.23.96:8080"
                      : "http://localhost:8080";