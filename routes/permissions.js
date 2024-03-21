

const {pool} = require('../utils/dbpool.js');


const activities = {
    editor: { permission_level: 1 }, 
    upload: { permission_level: 2 },
    admin: { permission_level: 3 }
};


const checkPermissions = async (socket, next) => {
    try {
        const userId = socket.handshake.session.passport.user.id;
        const userPermissions = await getUserPermissions(userId);
        
        const activity = activities[socket.event];
        if (!activity) {
            throw new Error('Activity not defined');
        }
        
        const requiredPermission = activity.permission_level;
        const hasPermission = userPermissions.some(permission => permission.permission_level >= requiredPermission);
        if (hasPermission) {
            next();
        } else {
            socket.emit('permission_error', 'Insufficient permissions');
        }
    } catch (error) {
        console.error('Error checking permissions:', error);
        socket.emit('server_error', 'Internal Server Error');
    }
};


const getUserPermissions = async (userId) => {
    try {
        const query = `
            SELECT role_permissions.permission_level
            FROM user_roles
            JOIN role_permissions ON user_roles.role_id = role_permissions.role_id
            WHERE user_roles.user_id = ?
            UNION
            SELECT permissions.permission_level
            FROM permissions
            WHERE permissions.user_id = ?
        `;
        const [rows, fields] = await pool.query(query, [userId, userId]);
        return rows.map(row => ({ permission_level: row.permission_level }));
    } catch (error) {
        throw new Error('Error fetching user permissions: ' + error.message);
    }
};





module.exports = {
	checkPermissions,
	activities,
}
