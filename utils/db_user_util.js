


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
        // User already exists, check for roles and permissions
        const userId = results[0].id;
        verifyAndUpdatePermissions(userId, connection, callback);
      } else {
        // Insert new user if they don't exist
        const insertUserQuery = 'INSERT INTO users SET ?';
        connection.query(insertUserQuery, user, (insertError) => {
          if (insertError) {
            console.error('Error inserting user:', insertError);
            connection.release();
            callback(insertError);
            return;
          }

          callback(null); // Success
        });
      }
    });
  });
}


function verifyAndUpdatePermissions(userId, connection, callback) {
  const getRolesQuery = `
    SELECT role_id FROM user_roles WHERE user_id = ?
  `;
  connection.query(getRolesQuery, [userId], (roleError, roleResults) => {
    if (roleError) {
      console.error('Error fetching user roles:', roleError);
      connection.release();
      callback(roleError);
      return;
    }

    if (roleResults.length === 0) {
      insertDefaultRoleAndPermissions(userId, connection, callback);
    }
  });
}



function insertDefaultRoleAndPermissions(userId, connection, callback) {
  const defaultRole = 3;
  const defaultPermissionLevel = 3;
  const insertRoleQuery = `
    INSERT INTO role_permissions (id, role_id, permission_level) VALUES (?, ?, ?)
  `;
  connection.query(insertRoleQuery, [userId, defaultRole, defaultPermissionLevel], (roleInsertError) => {
    if (roleInsertError) {
      console.error('Error inserting default role for user:', roleInsertError);
      connection.release();
      callback(roleInsertError);
      return;
    }
  });
}



module.exports = {
	addUserIfNotFound,
	
}
