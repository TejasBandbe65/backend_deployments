const mysql = require('mysql2');
const { dbconstants } = require('./env');

//connection pool
const pool = mysql.createPool({
    host: dbconstants.HOST,
    user: dbconstants.USER,
    password: dbconstants.PASSWORD,
    database: dbconstants.DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });

module.exports = pool;