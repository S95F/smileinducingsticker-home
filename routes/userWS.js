const uuid = require('uuid'); 
const {deleteExpiredSessions} = require('../utils/dbutil.js');
const {pool} = require('../utils/dbpool.js');

const handleUserInfo = (socket, cbf) => {
  if (socket.request.session.passport) {
    cbf(socket.request.session.passport.user);
  } else {
    cbf(false);
  }
};


const updateSessions = (socket, status, callback) => {
    const userId = socket.handshake.session.passport.user.id;
    const { v4: uuidv4 } = uuid;
    const uniqueCookie = uuidv4();
    const query = `
    INSERT INTO user_sessions (userid, status, cookie, expire)
	VALUES (?, ?, ?, NOW())
	ON DUPLICATE KEY UPDATE
	status = VALUES(status), cookie = VALUES(cookie), expire = NOW();
	`;
    const values = [userId, status, uniqueCookie];
    pool.query(query, values, (error, result) => {
      if (error) {
        console.error('Error storing session data:', error);
        callback(false);
      } else {
        callback(uniqueCookie);
      }
   });
}

const getSessions = (socket,callback) => {
	const userId = socket.handshake.session.passport.user.id;
    const query = `
      SELECT cookie, status FROM user_sessions
      WHERE userid = ? AND expire > NOW()
    `;
    const values = [userId];
    pool.query(query, values, (error, results) => {
      if (error) {
        console.error('Error fetching session data:', error);
        callback(false);
      } else {
        if (results.length === 0) {
          deleteExpiredSessions(userId, () => {
            callback(false);
          });
        } else {
          callback(results[0]);
        }
      }
    });
}


module.exports = {
  handleUserInfo,
  updateSessions,
  getSessions
};
