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
    return new Promise((resolve, reject) => {
        let results = {};

        let dataPromise = new Promise((res, rej) => {
            fs.readFile('dbconfig.json', 'utf8', (err, data) => {
                if (err) {
                    console.error(err);
                    return rej(err);
                }
                return res(JSON.parse(data));
            });
        });

        let dbJsonPromise = getDBtoJSON();

        Promise.all([dataPromise, dbJsonPromise])
            .then(([data, dbJson]) => {
                results.data = data;
                results.dbJson = dbJson;

                const dKeys = Object.keys(results.data.storedProcedures);
                const bKeys = dbJson==undefined?undefined:Object.keys(results.dbJson.storedProcedures);
                let OFKsp = [];
                for (let i in dKeys) {
                    if (results.data.storedProcedures[dKeys[i]] !== results.dbJson.storedProcedures[bKeys[i]]) {
                        OFKsp.push(dKeys[i]);
                    }
                }

                const cKeys = Object.keys(results.data.tables);
                const aKeys = dbJson==undefined||dbJson.tables==undefined?undefined:Object.keys(results.dbJson.tables);
                let OFKtb = [];
                for (let i in cKeys) {
                    if (results.data.tables[cKeys[i]] !== results.dbJson.tables[aKeys[i]]) {
                        OFKtb.push(cKeys[i]);
                    }
                }

                let promises = [];
                if (OFKsp.length !== 0 || OFKtb.length !== 0) {
                    for (let i in OFKsp) {
                        promises.push(execSql(results.data.storedProcedures[OFKsp[i]], []).catch(err => console.error(err)));
                    }
                    for (let i in OFKtb) {
                        const tableName = OFKtb[i];
                        promises.push(execSql(`SET FOREIGN_KEY_CHECKS=0;`).catch(err => console.error(err)));
                        promises.push(execSql(`DROP TABLE IF EXISTS ${tableName};`).catch(err => console.error(err)));
                        promises.push(execSql(results.data.tables[tableName], []).catch(err => console.error(err)));
                        promises.push(execSql(`SET FOREIGN_KEY_CHECKS=1;`).catch(err => console.error(err)));
                    }
                }

                return Promise.all(promises);
            })
            .then(() => {
                console.log("Validation Resolved");
                resolve();
            })
            .catch(err => {
                console.error("Error during validation:", err);
                reject(err);
            });
    });
}
module.exports = {
  getDBtoJSON,
  exportDB,
  validateDB
};
