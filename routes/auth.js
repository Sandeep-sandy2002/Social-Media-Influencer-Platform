const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const router = express.Router();
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "All fields required." });
  const hash = await bcrypt.hash(password, 10);
  db.query("INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)", [name, email, hash], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Email already registered." });
      return res.status(500).json({ error: "Database error." });
    }
    res.json({ user: { id: result.insertId, name, email } });
  });
});
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error." });
    if (!rows.length) return res.status(400).json({ error: "Invalid credentials." });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials." });
    res.json({ user: { id: user.id, name: user.full_name, email: user.email } });
  });
});

module.exports = router;
