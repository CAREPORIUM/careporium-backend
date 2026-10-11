import "dotenv/config";
import { io } from "socket.io-client";

const token = process.env.TEST_JWT;

if (!token) {
  console.error("Missing TEST_JWT in your environment.");
  process.exit(1);
}

const socket = io("http://localhost:8089", {
  auth: { token },
});
socket.on("connect", () => {
  console.log("Socket connected successfully.");
  console.log("Socket ID:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("Socket connection failed:", error.message);
});

socket.on("notification:new", (notification) => {
  console.log("Real-time notification received:");
  console.log(JSON.stringify(notification, null, 2));
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});