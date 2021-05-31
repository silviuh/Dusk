const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const expressLayouts = require('express-ejs-layouts');

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");
const User = require("./utils/user"); // our user model defined by the user schema
const e = require("express");

mongoose.connect('mongodb://localhost:27017/dusk', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const botName = "Dusk Bot";
const users = [];

app.get('/dashboard', (req, res) => { // dashboard endpoint
  res.render('dashboard.ejs', { userName: req.session.userName });
});

app.get('/profile', (req, res) => { // dashboard endpoint
  res.render('profile.ejs', { userName: req.session.userName });
});


app.get('/login', (req, res) => {
  res.render('login.ejs', { errorMessage: req.session.errorMessage }); // renders login.ejs
});

app.post("/check-valid-login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).lean();

  if (!user) {
    req.session.errorMessage = "Incorrect username or password.";
    res.redirect("/login");
  }
  else if (await bcrypt.compare(password, user.hashedPassword)) {
    req.session.userName = username;
    req.session.password = password;
    req.session.firstname = user.firstname;
    req.session.lastname = user.lastname;
    res.redirect("/dashboard");
    // return res.json({ status: 'ok', data: "okkk" })
  } else {
    req.session.errorMessage = "Incorrect username or password.";
    res.redirect("/login");
  }
});

app.get("/register", async (req, res) => {
  res.render('registration.ejs', { errorMessage: req.session.errorMessage }); // renders login.ejs
});

app.post("/register", async (req, res) => {
  const {
    firstname,
    lastname,
    username,
    password
  } = req.body;

  if (!password || typeof password !== 'string') {
    req.session.errorMessage = 'Invalid password';
    res.redirect("/register");
  }

  else if (password.length < 4) {
    req.session.errorMessage = 'Password too small. Should be atleast 6 characters'
    res.redirect("/register");
  }
  else {
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

    res.redirect("/login");
  }
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
