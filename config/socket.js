import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_LOCAL_URL,
        process.env.FRONTEND_PROD_URL,
        'http://127.0.0.1:5500',
        'http://localhost:8089',
        'https://careporium-backend.onrender.com',
        'https://careporium.netlify.app/'
      ].filter(Boolean),
      methods: ["GET", "POST", "PATCH"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.id || !decoded.role) {
        return next(new Error("Invalid authentication token"));
      }

      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    console.log(`Authenticated socket connected: ${socket.user.id}`);
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};

export { initSocket, getIO };