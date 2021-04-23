const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const cors = require("cors");

const sound = require("sound-play");
const fs = require("fs");

const path = require("path");

const filePath = path.join(__dirname, "buzz.mp3");

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

const PORT = process.env.PORT || 5000;

const router = require("./router");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on("connect", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });
    if (error) return callback(error);

    socket.join(user.room);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to room ${user.room}.`,
    });
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", { user: user.name, text: message });
    }
    // sound.play(filePath);

    callback();
  });

  socket.on("sound", () => {
    const user = getUser(socket.id);
    console.log("sound on server");
    fs.readFile(filePath, (err, buf) => {
      console.log("file");
      socket.broadcast.emit("sound", sound.play(filePath));
      // socket.emit("sound", { audio: true, buffer: buf.toString("base64") });
    });
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server ${PORT} is running`);
});
