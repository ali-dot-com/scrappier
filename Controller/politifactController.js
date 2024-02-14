const puppeteer = require("puppeteer");
const fs = require("fs");
const { Parser } = require("json2csv");

const politifactController = (req, res) => {
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }


  (async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setViewport({ width: 1100, height: 768 });

    let counter = 0;
    page.on('response', async (response) => {
      const matches = /.*\.(jpg|png|svg|gif)$/.exec(response.url());
      if (matches && (matches.length === 2)) {
        const extension = matches[1];
        const buffer = await response.buffer();
        fs.writeFileSync(`./extracted_data/images/politifact_images/image-${counter}.${extension}`, buffer, 'base64');
        counter += 1;
      }
    });

    console.log("Images Fetched")
    
    
    await page.goto("https://www.politifact.com/");
    await page.waitForSelector(".c-title--section");

    const pageHeight = await page.evaluate(
      () => document.documentElement.scrollHeight
    );

    for (let index = 0; index < 2; index++) {
      let scrollHeight = 0;
      let scrollTo = 1000;
      console.log(scrollHeight, " ", pageHeight);
      while (scrollHeight <= pageHeight) {
        if (scrollHeight != pageHeight) {
          scrollTo = Math.min(1000, pageHeight - scrollHeight);
          scrollHeight = scrollTo + scrollHeight;
        } else break;
        console.log(scrollHeight, " ", pageHeight);

        await page.evaluate((scrollTo) => {
          window.scrollBy(0, scrollTo);
        }, scrollTo);
        await delay(100); // Adjust the delay as needed
      }

      await page.evaluate(() => {
        window.scrollBy(0, document.body.scrollHeight);
      });
      await delay(100);

      const _title = await page.$$eval(".m-statement__name", (elements) => {
        return Array.from(elements).map((element) =>
          element.textContent.replace(/(\r\n|\n|\r)/gm, " ")
        );
      });
      const _description = await page.$$eval(
        ".m-statement__desc",
        (elements) => {
          return Array.from(elements).map((element) =>
            element.textContent.replace(/(\r\n|\n|\r)/gm, " ")
          );
        }
      );
      const _quote = await page.$$eval(
        ".m-statement__quote > a",
        (elements) => {
          return Array.from(elements).map((element) =>
            element.textContent.replace(/(\r\n|\n|\r)/gm, " ")
          );
        }
      );
      const _footer = await page.$$eval(".m-statement__footer", (elements) => {
        return Array.from(elements).map((element) =>
          element.textContent.replace(/(\r\n|\n|\r)/gm, " ")
        );
      });

      const data = [];
      for (let i = 0; i < _quote.length; i++) {
        data.push({
          title: _title[i] || "-",
          description: _description[i] || "-",
          quote: _quote[i] || "-",
          footer: _footer[i] || "-",
        });
      }

      // FOR UNIQUE DATA IF REQUIERD

      // const titles = Array.from(new Set(_title));
      // const descriptions = Array.from(new Set(_description));
      // const quotes = Array.from(new Set(_quote));
      // const footers = Array.from(new Set(_footer));

      // for (let i = 0; i < quotes.length; i++) {
      //   data.push({
      //     title: titles[i] || "-",
      //     description: descriptions[i] || "-",
      //     quote: quotes[i] || "-",
      //     footer: footers[i] || "-",
      //   });
      // }

      console.log(data);
      const fields = ["title", "description", "quote", "footer"];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      fs.writeFileSync("./extracted_data/text/politifact_data.csv", csv);

      await delay(1000);

      if (scrollHeight == pageHeight) {
        console.log("Done");
        break;
      }
    }
    await browser.close();
    res.render('scraped');
  })();
};

module.exports = { politifactController };
