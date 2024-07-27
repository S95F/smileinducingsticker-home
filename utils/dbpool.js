


const mysql = require('mysql');

const myauthobj = require('../ignore/auth.js').dbmain;

myauthobj.connectionLimit = 20;
const pool = mysql.createPool(myauthobj);


module.exports = {
	pool,
};
