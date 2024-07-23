var express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
var serveStatic = require('serve-static');
const uuid = require('uuid');
var app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
var passport = require("passport");
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
const expressSession = require('express-socket.io-session');
app.use(express.json({ limit: '1000mb' }));

const myauthobj = require('./ignore/auth.js'),
      TWITCH_CLIENT_ID = myauthobj.twitch.cid,
      TWITCH_SECRET = myauthobj.twitch.secret;
const {
    generateRandomSecret, getRandomImages, queueDirectory,
    preprocessTagsAndInsert, synchronizeImagesWithDatabase, insertImages,
    processImageQueue
} = require('./utils/generalUtils.js');
const { registerUser } = require('./routes/regUser.js');
const { loginUser } = require('./routes/loginUser.js');
const { handleUserInfo, updateSessions, getSessions } = require('./routes/userWS.js');
const { getTags, getRandomImagesSocket } = require('./routes/imageSearch.js');
const { getDBtoJSON, exportDB, validateDB } = require('./utils/databaseUtilities.js');
const { fetchGoogleProfile, fetchTwitchProfile } = require('./utils/userfetchUtils.js');
const { pool } = require('./utils/dbpool.js');
const { handleFileUpload } = require('./utils/handleFileUpload.js');

const SESSION_SECRET = generateRandomSecret(),
      CALLBACK_URL = 'http://localhost/auth/twitch/callback',
      googleCredentials = JSON.parse(fs.readFileSync('./auth/google.json')),
      CALLBACK_URL_GOOGLE = 'http://localhost/auth/google/callback/';

const sessionMiddleware = session({
    secret: SESSION_SECRET,
    resave: true,
    saveUninitialized: false
});

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

const { registerEvent } = require('./routes/permissions.js');
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use('twitch', new OAuth2Strategy({
    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
    tokenURL: 'https://id.twitch.tv/oauth2/token',
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_SECRET,
    callbackURL: CALLBACK_URL,
    state: true
}, fetchTwitchProfile));

app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }));
app.get('/auth/twitch/callback', passport.authenticate('twitch', { failureRedirect: '/fail' }), (req, res) => {
    res.redirect('/?auth=true');
});

passport.use('google', new OAuth2Strategy({
    authorizationURL: googleCredentials.auth_uri,
    tokenURL: googleCredentials.token_uri,
    clientID: googleCredentials.client_id,
    clientSecret: googleCredentials.client_secret,
    callbackURL: CALLBACK_URL_GOOGLE
}, fetchGoogleProfile));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback/', passport.authenticate('google', { failureRedirect: '/fail' }), (req, res) => {
    res.redirect('/?auth=true');
});

app.post('/register', registerUser);
app.post('/login', loginUser);

var htmlPath = path.join(__dirname, 'public');
console.log(htmlPath);

io.on('connection', (socket) => {
    socket.on("userInfo", registerEvent(socket, "userInfo", handleUserInfo));
    socket.on('user:sessionUpdate', registerEvent(socket, "user:sessionUpdate", updateSessions));
    socket.on('user:getSession', registerEvent(socket, "user:getSession", getSessions));
    socket.on('searchTags', registerEvent(socket, "searchTags", getTags));
    socket.on('getRandomImages', registerEvent(socket, "getRandomImages", getRandomImagesSocket));
    socket.on('uploadImages', registerEvent(socket, "uploadImages", handleFileUpload));
});

app.use(serveStatic(htmlPath));
server.listen();

// Logging mechanism to redirect console output to a file
const logFile = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });
const logStdout = process.stdout;

console.log = function (message) {
    logFile.write(new Date().toISOString() + " - LOG: " + message + '\n');
    logStdout.write(new Date().toISOString() + " - LOG: " + message + '\n');
};

console.error = function (message) {
    logFile.write(new Date().toISOString() + " - " + message + '\n');
    logStdout.write(new Date().toISOString() + " - " + message + '\n');
};


function validateDatabase() {
    return new Promise((resolve, reject) => {
        try {
            validateDB();
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

validateDatabase()
    .then(() => {
		queueDirectory('./public/imglib', './public/');
        console.log('Database validation complete.');
        return synchronizeImagesWithDatabase();
    })
    .then(() => {
        console.log('Image synchronization complete.');
    })
    .catch(error => {
        console.error('Error during validation or synchronization:', error);
    });
