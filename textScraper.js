const express = require("express");
const app = express();
const port = 3000;
const routes = require("./routes/routes.js");

app.set("view engine", "ejs");
app.get("/", routes);
app.get("/politifactScraper", routes);
app.get("/altnewsScraper", routes);
app.get("/mastodonScraper", routes);

app.listen(port, () => {
  console.log(`Test Scraper listening on port ${port}`);
});
