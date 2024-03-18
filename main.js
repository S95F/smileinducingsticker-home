var express = require('express')
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
var passport       = require("passport");
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
const expressSession = require('express-socket.io-session');

const myauthobj = require('./ignore/auth.js');
const TWITCH_CLIENT_ID = myauthobj.twitch.cid;
const TWITCH_SECRET    = myauthobj.twitch.secret;

app.use(express.json({ limit: '1000mb' }));

const connection = require('./utils/dbpool.js');

const {addUserIfNotFound} = require('./utils/db_user_util.js');
const {generateRandomSecret, getRandomImages, queueDirectory, preprocessTagsAndInsert, synchronizeImagesWithDatabase, insertImages} = require('./utils/generalUtils.js');
const {isValidLogin, deleteExpiredSessions} = require('./utils/dbutil.js');
const {registerUser} = require('./routes/regUser.js');
const {loginUser} = require('./routes/loginUser.js');
const {handleUserInfo,updateSessions,getSessions} = require('./routes/userWS.js');
const {getTags,getRandomImagesSocket} = require('./routes/imageSearch.js');
const {fetchGoogleProfile,fetchTwitchProfile} = require('./utils/userfetchUtils.js');

const sessionMiddleware = session({secret: generateRandomSecret(),resave: true,saveUninitialized: true,});
app.use(sessionMiddleware);
io.use(expressSession(sessionMiddleware, {autoSave: true,}));
const SESSION_SECRET   = generateRandomSecret();
const CALLBACK_URL     = 'http://localhost/auth/twitch/callback';
const googleCredentials = JSON.parse(fs.readFileSync('./auth/google.json'));
const CALLBACK_URL_GOOGLE = 'http://localhost/auth/google/callback/';
app.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
passport.serializeUser(function(user, done) {done(null, user);});
passport.deserializeUser(function(user, done) {done(null, user);});
passport.use('twitch', new OAuth2Strategy({authorizationURL: 'https://id.twitch.tv/oauth2/authorize',tokenURL: 'https://id.twitch.tv/oauth2/token',clientID: TWITCH_CLIENT_ID,clientSecret: TWITCH_SECRET,callbackURL: CALLBACK_URL,state: true},fetchTwitchProfile));
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }));
app.get('/auth/twitch/callback',passport.authenticate('twitch', { failureRedirect: '/fail' }),(req, res) => {res.redirect('/?auth=true');});
passport.use('google', new OAuth2Strategy({authorizationURL: googleCredentials.auth_uri,tokenURL: googleCredentials.token_uri,clientID: googleCredentials.client_id,clientSecret: googleCredentials.client_secret,callbackURL:CALLBACK_URL_GOOGLE},fetchGoogleProfile));
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback/',passport.authenticate('google', { failureRedirect: '/fail' }),(req, res) => {res.redirect('/?auth=true');});
app.post('/register', registerUser);
app.post('/login', loginUser);
var htmlPath = path.join(__dirname, 'public');
console.log(htmlPath);
io.on('connection', (socket) => {
  socket.on("userInfo",() => handleUserInfo(socket));
  socket.on('user:sessionUpdate', (status,callback) => updateSessions(socket,status,callback));
  socket.on('user:getSession', (callback) => getSessions(socket,callback));
  socket.on('searchTags', (searchTerm,page,pageSize) => getTags(socket,searchTerm,page,pageSize));
  socket.on('getRandomImages', (receivedImages) => getRandomImagesSocket(socket,receivedImages));
});
app.use(serveStatic(htmlPath));
server.listen(80);
queueDirectory('./public/imglib','./html/');
synchronizeImagesWithDatabase().then(() => {console.log('Image synchronization complete.');}).catch(error => console.log('Error during image synchronization:', error));


