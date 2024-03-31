

const {pool} = require('../utils/dbpool.js');


const activities = {
    userInfo: { permission_level: 1, requiresAuth: false },
    sessionUpdate: { permission_level: 1, requiresAuth: true },
    getSession: { permission_level: 1, requiresAuth: true },
    searchTags: { permission_level: 1, requiresAuth: false },
    getRandomImages: { permission_level: 1, requiresAuth: false },
    uploadImages: { permission_level: 1, requiresAuth: false }
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


function registerEvent(socket, eventName, handler) {
    return async (...args) => {
        try {
			console.log(eventName);
            const activity = activities[eventName];
            console.log(activity);
            if (!activity || !activity.requiresAuth) {
                return handler(socket, ...args);
            }
            if (!socket.handshake.session?.passport?.user) {
				console.log('auth_error: ', socket.handshake);
                socket.emit('auth_error', 'Authentication required');
                return;
            }
            const user = socket.handshake.session.passport.user;
            const userPermissions = await getUserPermissions(user.id);
            const hasPermission = userPermissions.some(permission => permission.permission_level >= activity.permission_level);
            console.log(hasPermission);
            if (!hasPermission) {
				console.log('perm_error');
                socket.emit('permission_error', 'Insufficient permissions');
                return;
            }
            return handler(socket, ...args);
        } catch (error) {
            console.error(`Error in registerEvent for ${eventName}:`, error);
            socket.emit('server_error', 'Internal Server Error');
            return;
        }
    };
}


module.exports = {
	checkPermissions,
	activities,
	registerEvent,
}
