


const mysql = require('mysql');

const myauthobj = require('../ignore/auth.js').dbmain;

myauthobj.connectionLimit = 10;
const imagepoolconfig = {...myauthobj};
imagepoolconfig.database = 'smileinducingstickerimages';
const imagepool = mysql.createPool(imagepoolconfig);
const pool = mysql.createPool(myauthobj);


module.exports = {
	pool,
	imagepool
};
