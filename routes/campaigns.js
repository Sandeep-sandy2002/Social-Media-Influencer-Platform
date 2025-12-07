const express = require("express");
const db = require("../db");
const router = express.Router();

// GET campaigns
router.get("/", (req, res) => {
  const userId = Number(req.query.user_id) || 0;

  db.query(
    "SELECT * FROM campaigns ORDER BY created_at DESC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB error." });

      const result = rows.map(c => ({
        ...c,
        can_edit: c.user_id === userId,
        can_delete: c.user_id === userId
      }));

      res.json(result);
    }
  );
});

// CREATE campaign (with campaign_link)
router.post("/", (req, res) => {
  const { user_id, title, description, budget, target_niche, campaign_link } = req.body;

  if (!user_id) return res.status(400).json({ error: "user_id required" });
  if (!title) return res.status(400).json({ error: "title required" });

  db.query(
    "INSERT INTO campaigns (user_id, title, description, budget, target_niche, campaign_link) VALUES (?, ?, ?, ?, ?, ?)",
    [user_id, title, description, budget, target_niche, campaign_link || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: "DB error" });

      res.json({ message: "Campaign created", id: result.insertId });
    }
  );
});

// UPDATE campaign (with campaign_link)
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { user_id, title, description, budget, target_niche, campaign_link } = req.body;

  if (!user_id) return res.status(400).json({ error: "user_id required" });

  db.query("SELECT user_id FROM campaigns WHERE id=?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!rows.length) return res.status(404).json({ error: "Campaign not found" });

    if (rows[0].user_id !== user_id) return res.status(403).json({ error: "Not allowed" });

    db.query(
      "UPDATE campaigns SET title=?, description=?, budget=?, target_niche=?, campaign_link=? WHERE id=?",
      [title, description, budget, target_niche, campaign_link || null, id],
      (err2) => {
        if (err2) return res.status(500).json({ error: "DB error" });

        res.json({ message: "Campaign updated" });
      }
    );
  });
});

// DELETE campaign
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const user_id = Number(req.body.user_id);

  db.query("SELECT user_id FROM campaigns WHERE id=?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!rows.length) return res.status(404).json({ error: "Campaign not found" });

    if (rows[0].user_id !== user_id) return res.status(403).json({ error: "Not allowed" });

    db.query("DELETE FROM campaigns WHERE id=?", [id], (err2) => {
      if (err2) return res.status(500).json({ error: "DB error" });

      res.json({ message: "Campaign deleted" });
    });
  });
});

module.exports = router;
