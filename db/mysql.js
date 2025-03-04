import mysql from 'mysql2/promise';

export const mysqlConnection = mysql.createPool({
    host: process.env.DB_HOST2,
    user: process.env.DB_USERNAME2,
    password: process.env.DB_PASSWORD2,
    database: process.env.DB_NAME2,
    port: process.env.DB_PORT2,
});

