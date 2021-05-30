const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");
const User = require("./utils/user"); // our user model defined by the user schema

mongoose.connect('mongodb://localhost:27017/dusk', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const botName = "Dusk Bot";
const users = [];

app.get("/users/login", async (req, res) => {
  console.log("am ajuns si aici");
});

app.post("/users/login", async (req, res) => {
  console.log(req.body);
  res.redirect("http://localhost:3000/chat.html");
});

app.get("/users/register", async (req, res) => {
  // res.json(users);
});

app.post("/users/register", async (req, res) => {
  const {
    firstname,
    lastname,
    username,
    password
  } = req.body;

  if (!password || typeof password !== 'string') {
    return res.json({ status: 'error', error: 'Invalid password' })
  }

  if (password.length < 4) {
    return res.json({
      status: 'error',
      error: 'Password too small. Should be atleast 6 characters'
    })
  }
  // console.log(`firstname: ${firstname} lastname: ${lastname} name: ${username} passwd: ${password}`);
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await User.create({
      firstname,
      lastname,
      username,
      hashedPassword
    })
    console.log('user created succesfully');
  } catch (error) {
    console.log(error);
    return res.json({ status: 'error' });
  }

  return res.json({ status: 'ok' });
});

// Run when client connects
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `[${user.username}] has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `[${user.username}] has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
