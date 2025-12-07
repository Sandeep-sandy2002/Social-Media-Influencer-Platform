// influencers.js (updated) - supports price_post, price_video, price_promotion
const express = require("express");
const db = require("../db");
const router = express.Router();

const DELETED_USER_EMAIL = "deleted_user@system.local";
const DELETED_USER_NAME = "Deleted User";

function getOrCreateDeletedUserId(cb) {
  db.query("SELECT id FROM users WHERE email = ?", [DELETED_USER_EMAIL], (err, rows) => {
    if (err) return cb(err);
    if (rows.length) return cb(null, rows[0].id);
    db.query(
      "INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)",
      [DELETED_USER_NAME, DELETED_USER_EMAIL, ""],
      (err2, result) => {
        if (err2) return cb(err2);
        return cb(null, result.insertId);
      }
    );
  });
}

function ensureInfluencersHaveOwner(cb) {
  getOrCreateDeletedUserId((err, delId) => {
    if (err) return cb(err);
    db.query("UPDATE influencers SET user_id = ? WHERE user_id IS NULL", [delId], (e) => {
      if (e) return cb(e);
      cb(null, delId);
    });
  });
}

// GET ALL INFLUENCERS
router.get("/", (req, res) => {
  const loggedUserId = Number(req.query.user_id) || 0;

  ensureInfluencersHaveOwner((err) => {
    if (err) return res.status(500).json({ error: "DB error." });

    db.query(
      `SELECT i.*, 
              CASE WHEN f.user_id IS NULL THEN 0 ELSE 1 END AS is_following
       FROM influencers i 
       LEFT JOIN followers f ON i.id = f.influencer_id AND f.user_id = ? 
       ORDER BY i.created_at DESC`,
      [loggedUserId],
      (err2, rows) => {
        if (err2) return res.status(500).json({ error: "DB error." });

        const result = rows.map((inf) => ({
          ...inf,
          can_edit: inf.user_id === loggedUserId,
          can_delete: inf.user_id === loggedUserId,
          can_follow: inf.user_id !== loggedUserId && !inf.is_following,
          can_unfollow: inf.user_id !== loggedUserId && !!inf.is_following,
        }));

        res.json(result);
      }
    );
  });
});

// GET FOLLOW LIST
router.get("/follows", (req, res) => {
  const userId = Number(req.query.user_id) || 0;

  if (!userId) return res.json([]);

  db.query("SELECT influencer_id FROM followers WHERE user_id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error." });

    const ids = rows.map(r => r.influencer_id);
    res.json(ids);
  });
});

// CREATE INFLUENCER
router.post("/", (req, res) => {
  const { user_id, name, niche, followers, bio, image_url, social_link, price_post, price_video, price_promotion } = req.body;

  if (!user_id) return res.status(400).json({ error: "user_id required." });
  if (!name) return res.status(400).json({ error: "Name required." });

  db.query(
    "INSERT INTO influencers (user_id, name, niche, followers, bio, image_url, social_link, price_post, price_video, price_promotion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [user_id, name, niche || null, followers || 0, bio || "", image_url || null, social_link || null, price_post || null, price_video || null, price_promotion || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: "DB error." });

      res.json({ message: "Influencer added.", id: result.insertId });
    }
  );
});

// UPDATE INFLUENCER
router.put("/:id", (req, res) => {
  const influencerId = Number(req.params.id);
  const { user_id, name, niche, followers, bio, image_url, social_link, price_post, price_video, price_promotion } = req.body;

  if (!user_id && user_id !== 0) return res.status(400).json({ error: "user_id required." });

  db.query("SELECT user_id FROM influencers WHERE id = ?", [influencerId], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error." });
    if (!rows.length) return res.status(404).json({ error: "Influencer not found." });

    if (rows[0].user_id !== user_id)
      return res.status(403).json({ error: "You are not the creator." });

    db.query(
      "UPDATE influencers SET name = ?, niche = ?, followers = ?, bio = ?, image_url = ?, social_link = ?, price_post = ?, price_video = ?, price_promotion = ? WHERE id = ?",
      [name || null, niche || null, followers || 0, bio || "", image_url || null, social_link || null, price_post || null, price_video || null, price_promotion || null, influencerId],
      (e) => {
        if (e) return res.status(500).json({ error: "DB error." });

        res.json({ message: "Influencer updated." });
      }
    );
  });
});

// DELETE INFLUENCER
router.delete("/:id", (req, res) => {
  const influencerId = Number(req.params.id);
  const userId = Number(req.body.user_id || req.query.user_id);

  if (!userId) return res.status(400).json({ error: "user_id required." });

  db.query("SELECT user_id FROM influencers WHERE id = ?", [influencerId], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error." });
    if (!rows.length) return res.status(404).json({ error: "Influencer not found." });

    if (rows[0].user_id !== userId)
      return res.status(403).json({ error: "You are not the creator." });

    db.query("DELETE FROM influencers WHERE id = ?", [influencerId], (e) => {
      if (e) return res.status(500).json({ error: "DB error." });

      res.json({ message: "Influencer deleted." });
    });
  });
});

// FOLLOW INFLUENCER
router.post("/:id/follow", (req, res) => {
  const influencerId = Number(req.params.id);
  const userId = Number(req.body.user_id);

  if (!userId) return res.status(400).json({ error: "user_id required." });

  db.query("SELECT user_id FROM influencers WHERE id = ?", [influencerId], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error." });
    if (!rows.length) return res.status(404).json({ error: "Influencer not found." });

    if (rows[0].user_id === userId)
      return res.status(400).json({ error: "Cannot follow your own profile." });

    db.query(
      "INSERT INTO followers (user_id, influencer_id) VALUES (?, ?)",
      [userId, influencerId],
      (err2) => {
        if (err2) {
          if (err2.code === "ER_DUP_ENTRY")
            return res.status(400).json({ error: "Already following." });

          return res.status(500).json({ error: "DB error." });
        }

        db.query("UPDATE influencers SET followers = followers + 1 WHERE id = ?", [influencerId], (e) => {
          if (e) return res.status(500).json({ error: "Failed update count." });

          res.json({ message: "Followed influencer." });
        });
      }
    );
  });
});

// UNFOLLOW INFLUENCER
router.post("/:id/unfollow", (req, res) => {
  const influencerId = Number(req.params.id);
  const userId = Number(req.body.user_id);

  if (!userId) return res.status(400).json({ error: "user_id required." });

  db.query(
    "DELETE FROM followers WHERE user_id = ? AND influencer_id = ?",
    [userId, influencerId],
    (err, result) => {
      if (err) return res.status(500).json({ error: "DB error." });

      if (!result.affectedRows)
        return res.status(400).json({ error: "Not following." });

      db.query(
        "UPDATE influencers SET followers = GREATEST(followers - 1, 0) WHERE id = ?",
        [influencerId],
        (e) => {
          if (e) return res.status(500).json({ error: "Failed update count." });

          res.json({ message: "Unfollowed influencer." });
        }
      );
    }
  );
});

module.exports = router;
