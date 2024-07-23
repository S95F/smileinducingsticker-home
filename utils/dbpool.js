


const mysql = require('mysql');

const myauthobj = require('../ignore/auth.js').dbmain;

myauthobj.connectionLimit = 10;
const pool = mysql.createPool(myauthobj);


module.exports = {
	pool
};
