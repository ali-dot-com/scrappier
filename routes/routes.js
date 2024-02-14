const express = require("express");
const router = express.Router();
const politifact = require("../Controller/politifactController");
const altnews = require("../Controller/altnewsController");
const mastodon = require("../Controller/mastodonController");

router.get("/", (req, res) => {
  res.render("home");
});

router.get("/politifactScraper", politifact.politifactController);
router.get("/altnewsScraper", altnews.altnewsController);
router.get("/mastodonScraper", mastodon.mastodonController);

module.exports = router;
