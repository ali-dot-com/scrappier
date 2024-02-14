const puppeteer = require("puppeteer");
const fs = require("fs");
const { Parser } = require("json2csv");

const mastodonController = (req, res) => {
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  (async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 768 });

    let counter = 0;
    page.on("response", async (response) => {
      const matches = /.*\.(jpg|png|svg|gif)$/.exec(response.url());
      if (matches && matches.length === 2) {
        const extension = matches[1];
        const imageURL = response.url();
        const filePath = `./extracted_data/images/mastodon_images/image-${counter}.${extension}`;

        if (!fs.existsSync(filePath)) {
          const buffer = await response.buffer();
          fs.writeFileSync(filePath, buffer, "base64");
          counter += 1;
        } 
      }
    });
    await page.goto("https://mastodon.social/explore");

    const duplicateNames = [];
    const duplicateUserNames = [];
    const duplicateContent = [];
    const videoLinks = [];
    const pageHeight = 10000; // Total height to cover. Increasing this will increase the scroll
    const scrollStep = 300;

    let scrollHeight = 0;

    while (scrollHeight <= pageHeight) {
      const scrollTo = Math.min(scrollStep, pageHeight - scrollHeight);
      await page.evaluate((scrollTo) => {
        window.scrollBy(0, scrollTo);
      }, scrollTo);
      await delay(1000); // Adjust the delay as needed
      scrollHeight += scrollTo;
      console.log(scrollHeight + "  " + pageHeight);

      const currentScrollHeight = await page.evaluate(
        () => document.documentElement.scrollHeight
      );
      if (currentScrollHeight != scrollHeight) {

        console.log("not equal")
        const _names = await page.evaluate(() => {
          const elements = document.querySelectorAll(
            ".status__display-name .display-name__html"
          );
          return Array.from(elements).map((element) =>
            element.textContent.trim()
          );
        });
        duplicateNames.push(..._names);

        const _content = await page.$eval(
          ".status__content__text.status__content__text--visible.translate",
          (div) => {
            const paragraphs = div.querySelectorAll("p");
            let mergedText = "";
            paragraphs.forEach((paragraph) => {
              mergedText += paragraph.textContent.trim() + " ";
            });
            return mergedText.trim();
          }
        );
        _content.length < 3
          ? duplicateContent.push("-")
          : duplicateContent.push(_content);

        const _usernames = await page.evaluate(() => {
          const elements = document.querySelectorAll(".display-name__account");
          return Array.from(elements).map((element) =>
            element.textContent.trim()
          );
        });
        duplicateUserNames.push(..._usernames);

        const videoSrc = await page.evaluate(() => {
          const video = document.querySelector("video");
          return video ? video.getAttribute("src") : null;
        });

        if (videoSrc) {
          videoLinks.push(videoSrc);
        }
      }
      // Extract names from the scrolled page
      if (scrollHeight === pageHeight) {
        break;
      }
    }
    fs.writeFileSync(
      "./extracted_data/videos/mastodon_video_link.txt",
      videoLinks.toString()
    ); //writing video links to a file

    const names = Array.from(new Set(duplicateNames));
    const usernames = Array.from(new Set(duplicateUserNames));
    usernames.shift(); //removing one unnecessary element
    const contents = Array.from(new Set(duplicateContent));

    const data = [];
    for (let i = 0; i < names.length; i++) {
      data.push({
        Name: names[i] || "-",
        Username: usernames[i] || "-",
        Content: contents[i] || "-",
      });
    }

    const fields = ["Name", "Username", "Content"];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);
    fs.writeFile("./extracted_data/text/mastodon_data.csv", csv, (err) => {
      if (err) {
        console.error("Error writing data to CSV file:", err);
      } else {
        console.log("Data written to CSV file successfully.");
      }
    });

    await browser.close();
    res.render("scraped");
  })();
};

module.exports = { mastodonController };
