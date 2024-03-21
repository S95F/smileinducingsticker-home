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
app.use(express.json({ limit: '1000mb' }));
const myauthobj = require('./ignore/auth.js'),TWITCH_CLIENT_ID = myauthobj.twitch.cid,TWITCH_SECRET = myauthobj.twitch.secret;
const {generateRandomSecret, getRandomImages, queueDirectory, preprocessTagsAndInsert, synchronizeImagesWithDatabase, insertImages,processImageQueue} = require('./utils/generalUtils.js');
const {registerUser} = require('./routes/regUser.js');
const {loginUser} = require('./routes/loginUser.js');
const {handleUserInfo,updateSessions,getSessions} = require('./routes/userWS.js');
const {getTags,getRandomImagesSocket} = require('./routes/imageSearch.js');
const {fetchGoogleProfile,fetchTwitchProfile} = require('./utils/userfetchUtils.js');
const {pool} = require('./utils/dbpool.js');
const SESSION_SECRET = generateRandomSecret(), CALLBACK_URL = 'http://localhost/auth/twitch/callback', googleCredentials = JSON.parse(fs.readFileSync('./auth/google.json')), CALLBACK_URL_GOOGLE = 'http://localhost/auth/google/callback/';
const sessionMiddleware = session({
    secret: SESSION_SECRET, 
    resave: false, 
    saveUninitialized: false
});
const {checkPermissions,activities} = require('./routes/permissions.js');
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));app.use(express.urlencoded({ extended: true }));
passport.serializeUser(function(user, done) {done(null, user);});passport.deserializeUser(function(user, done) {done(null, user);});
passport.use('twitch', new OAuth2Strategy({authorizationURL: 'https://id.twitch.tv/oauth2/authorize',tokenURL: 'https://id.twitch.tv/oauth2/token',clientID: TWITCH_CLIENT_ID,clientSecret: TWITCH_SECRET,callbackURL: CALLBACK_URL,state: true},fetchTwitchProfile));
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }));
app.get('/auth/twitch/callback',passport.authenticate('twitch', { failureRedirect: '/fail' }),(req, res) => {res.redirect('/?auth=true');});
passport.use('google', new OAuth2Strategy({authorizationURL: googleCredentials.auth_uri,tokenURL: googleCredentials.token_uri,clientID: googleCredentials.client_id,clientSecret: googleCredentials.client_secret,callbackURL:CALLBACK_URL_GOOGLE},fetchGoogleProfile));
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback/',passport.authenticate('google', { failureRedirect: '/fail' }),(req, res) => {res.redirect('/?auth=true');});
app.post('/register', registerUser);app.post('/login', loginUser);
var htmlPath = path.join(__dirname, 'public');console.log(htmlPath);
io.use(async (socket, next) => {
    try {
        if (!socket.handshake.session.passport || !socket.handshake.session.passport.user) {
            throw new Error('User not authenticated');
        }
        const user = socket.handshake.session.passport.user;
        if (!user.permissions || user.permissions.length === 0) {
            throw new Error('No permissions assigned');
        }
        // ...existing permission check logic...
    } catch (error) {
        console.error('Error in middleware:', error);
        socket.emit('server_error', 'Internal Server Error');
    }
});
io.on('connection', (socket) => {
  socket.on("userInfo",() => handleUserInfo(socket));
  socket.on('user:sessionUpdate', (status,callback) => updateSessions(socket,status,callback));
  socket.on('user:getSession', (callback) => getSessions(socket,callback));
  socket.on('searchTags', (searchTerm,page,pageSize) => getTags(socket,searchTerm,page,pageSize));
  socket.on('getRandomImages', (receivedImages) => getRandomImagesSocket(socket,receivedImages));
});
app.use(serveStatic(htmlPath));
server.listen(80);
queueDirectory('./public/imglib','./public/');
synchronizeImagesWithDatabase().then(() => {console.log('Image synchronization complete.');}).catch(error => console.log('Error during image synchronization:', error));


