const mysql = require("mysql2");
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Sandeep@2002",
  database: "connectus_db",
  multipleStatements: false
});
db.connect((err) => {
  if (err) {
    console.error("MySQL connection error:", err);
    process.exit(1);
  }
  console.log("MySQL Connected to connectus_db");
});
module.exports = db;
