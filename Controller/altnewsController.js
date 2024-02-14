const puppeteer = require("puppeteer");
const fs = require("fs");
const { Parser } = require("json2csv");

const altnewsController = (req, res) => {
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  (async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 768 });

    let counter = 0;
    let imageExists = false;
    page.on("response", async (response) => {
      const matches = /.*\.(jpg|png|svg|gif)$/.exec(response.url());
      if (matches && matches.length === 2) {
        const extension = matches[1];
        const imageURL = response.url();
        const filePath = `./extracted_data/images/altnews_images/image-${counter}.${extension}`;

        if (!fs.existsSync(filePath)) {
          const buffer = await response.buffer();
          fs.writeFileSync(filePath, buffer, "base64");
          counter += 1;
          console.log("Image fetched: ", imageURL);
        } else {
          imageExists = true;
          console.log("Image already fetched");
        }
      }
    });

    await page.goto("https://www.altnews.in/");
    await page.waitForSelector(".widget-title-wrapper .widget-title");

    const pageHeight = 10000; //total height to cover. increasing this will increase the scroll
    let scrollHeight = 0;
    let scrollTo = 800;
    console.log(scrollHeight, " ", pageHeight);
    while (scrollHeight <= pageHeight) {
      if (scrollHeight != pageHeight) {
        scrollTo = Math.min(800, pageHeight - scrollHeight);
        scrollHeight = scrollTo + scrollHeight;
      } else break;
      console.log(scrollHeight, " ", pageHeight);

      await page.evaluate((scrollTo) => {
        window.scrollBy(0, scrollTo);
      }, scrollTo);
      await delay(500); // Adjust the delay as needed
    }
    await delay(1000);

    const _title = await page.$$eval("h4.entry-title a", (elements) => {
      return Array.from(elements).map((element) =>
        element.textContent.replace(/(\r\n|\n|\r)/gm, " ")
      );
    });

    const _postingTime = await page.$$eval(
      "span.posted-on time",
      (elements) => {
        return Array.from(elements).map((element) =>
          element.textContent.replace(/(\r\n|\n|\r)/gm, " ")
        );
      }
    );

    const _author = await page.$$eval(
      "div.entry-meta.pbs_e-m.below a",
      (elements) => {
        return Array.from(elements).map((element) =>
          element.textContent.replace(/(\r\n|\n|\r)/gm, " ")
        );
      }
    );

    const _videoLink = await page.$eval(".youtube-player", (anchor) =>
      anchor.getAttribute("src")  
    );

    const data = [];
    for (let i = 0; i < _postingTime.length; i++) {
      data.push({
        Title: _title[i] || "-",
        Posting_Time: _postingTime[i] || "-",
        Author: _author[i] || "-",
      });
    }
    console.log(data);
    const fields = ["Title", "Posting_Time", "Author"];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);
    fs.writeFile("./extracted_data/text/altnews_data.csv", csv, (err) => {
      if (err) {
        console.error("Error writing data to CSV file:", err);
      } else {
        console.log("Data written to CSV file successfully.");
      }
    });
    fs.writeFileSync('./extracted_data/videos/altnews_video_link.txt', _videoLink);
    await delay(1000);
    await browser.close();
    res.render('scraped')
  })();
};

module.exports = { altnewsController };
