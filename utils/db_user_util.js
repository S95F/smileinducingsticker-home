


const {pool} = require('../utils/dbpool.js');





function addUserIfNotFound(user, callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:', err);
      callback(err);
      return;
    }

    const checkUserQuery = 'SELECT id FROM users WHERE email = ? AND provider = ?';
    connection.query(checkUserQuery, [user.email, user.provider], (error, results) => {
      if (error) {
        console.error('Error checking user existence:', error);
        connection.release();
        callback(error);
        return;
      }

      if (results.length > 0) {
        // User already exists
        connection.release();
        callback('User already exists');
        return;
      }

      const insertUserQuery = 'INSERT INTO users SET ?';
      connection.query(insertUserQuery, user, (insertError) => {
        connection.release();
        if (insertError) {
          console.error('Error inserting user:', insertError);
          callback(insertError);
          return;
        }

        callback(null); // Success
      });
    });
  });
}




module.exports = {
	addUserIfNotFound,
	
}
