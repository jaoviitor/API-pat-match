const mysql = require('mysql2');

const pool = mysql.createPool({
    "user": 'root',
    "password": 'jv5712',
    "database": 'PatMatch',
    "host": 'localhost',
    "port": 3306
});

exports.pool;