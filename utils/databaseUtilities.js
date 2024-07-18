const { pool } = require('../utils/dbpool.js');
const fs = require('fs');
const config = require('../ignore/auth.js');

function execSql(statement, values) {
  return new Promise((res, rej) => {
    pool.query(statement, values, (err, result) => {
      if (err) rej(err);
      else res(result);
    });
  }).catch((err) => {
    console.error(err);
  });
}

function getDBtoJSON() {
  const sql = "SHOW PROCEDURE STATUS WHERE Db = ?;";
  return execSql(sql, [config.dbmain.database]).then((r) => {
    let json = {};
    let promises = [];
    for (let n in r) {
      const sqlInner = "show create procedure " + r[n].Name + ";";
      promises.push(execSql(sqlInner, []).then((r) => {
        json[r[0].Procedure] = r[0]['Create Procedure'];
      }));
    }
    return Promise.all(promises).then(() => {
      let temp = {};
      temp.storedProcedures = json;
      json = temp;
      return json;
    });
  }).then((json) => {
    const s = "show tables;";
    return execSql(s, []).then((r) => {
      let promises = [];
      json.tables = {};
      for (let i in r) {
        promises.push(execSql("show create table " + r[i]["Tables_in_" + config.dbmain.database], []).then((r) => {
          json.tables[r[0].Table] = r[0]['Create Table'];
        }));
      }
      return Promise.all(promises).then(() => json);
    });
  }).catch((err) => {
    console.error(err);
  });
}

function exportDB() {
  getDBtoJSON().then((r) => {
    fs.writeFile('dbconfig.json', JSON.stringify(r), (err) => {
      if (err) {
        console.error(err);
      }
    });
    console.log("dbconfig.json created.");
  });
}

function validateDB() {
  let results = {};
  let data = new Promise((res, rej) => {
    fs.readFile('dbconfig.json', 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return rej(err);
      }
      return res(JSON.parse(data));
    });
  });
  data.then((r) => { results.data = r; });
  let dbJson = getDBtoJSON();
  dbJson.then((r) => { results.dbJson = r; });
  Promise.all([dbJson, data]).then(() => {
    const dKeys = Object.keys(results.data.storedProcedures);
    const bKeys = Object.keys(results.dbJson.storedProcedures);
    let OFKsp = [];
    for (let i in dKeys) {
      if (results.data.storedProcedures[dKeys[i]] != results.dbJson.storedProcedures[bKeys[i]]) {
        OFKsp.push(dKeys[i]);
      }
    }
    const cKeys = Object.keys(results.data.tables);
    const aKeys = Object.keys(results.dbJson.tables);
    let OFKtb = [];
    for (let i in cKeys) {
      if (results.data.tables[cKeys[i]] != results.dbJson.tables[aKeys[i]]) {
        OFKtb.push(cKeys[i]);
      }
    }
    let p = [];
    if (OFKsp.length != 0 || OFKtb.length != 0) {
      for (let i in OFKsp) {
        p.push(execSql(results.data.storedProcedures[OFKsp[i]], []).catch((err) => {
          console.error(err);
        }));
      }
      for (let i in OFKtb) {
        p.push(execSql('drop table ' + OFKtb[i], []).catch((err) => {
          console.error(err);
        }));
        p.push(execSql(results.data.tables[OFKtb[i]], []).catch((err) => {
          console.error(err);
        }));
      }
      Promise.all(p).then(() => { console.log("Validation Resolved"); });
    } else {
      console.log("Validated");
    }
  });
}

module.exports = {
  getDBtoJSON,
  exportDB,
  validateDB
};
