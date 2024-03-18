

const bcrypt = require('bcrypt');
const pool = require('../utils/dbpool.js');




function isValidLogin(email, password, callback) {
    const selectUserQuery = 'SELECT id, email, password, profPic, display_name, provider FROM users WHERE email = ? and provider = ?';
    pool.query(selectUserQuery, [email,'self'], (error, results) => {
        if (error) {
            return callback(error, false);
        }
        if (results.length === 0) {
            return callback(null, false);
        }
        const user = results[0];
        bcrypt.compare(password, user.password, (bcryptError, isMatch) => {
            if (bcryptError) {
                return callback(bcryptError, false);
            }
            if (isMatch) {
                delete user.password;
                return callback(null, user);
            } else {
                return callback(null, false);
            }
        });
    });
}

function deleteExpiredSessions(userId, callback) {
  const deleteQuery = `
    DELETE FROM user_sessions
    WHERE userid = ? AND expire <= NOW()
  `;
  const deleteValues = [userId];

  // Execute the delete query with a callback
  pool.query(deleteQuery, deleteValues, (error, result) => {
    if (error) {
      console.error('Error deleting expired sessions:', error);
    }
    // Call the provided callback
    callback();
  });
}


module.exports = {
	isValidLogin,
	deleteExpiredSessions,
}
