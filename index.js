const appStore = require("app-store-scraper");
const { Command } = require("commander");
const { once } = require("events");
const fs = require("fs");
const https = require("https");
const path = require("path");

const program = new Command();

program
  .description("retrieve metadata about App Store entries")
  .requiredOption("-id, --app-id <appId>", "app store id")
  .option("-c, --country <country>", "country code", "us")
  .option("-i, --images", "download metadata images")
  .parse();

(async function () {
  const { appId, country, images } = program.opts();

  console.log("retrieving metadata for", appId);

  try {
    const metadata = await appStore.app({ id: appId, country });

    const { appId: id, title, url, genres, score } = metadata;
    console.log({ id, title, url, genres, score });

    if (images) {
      const { screenshots, ipadScreenshots, icon } = metadata;

      const outPath = path.join(__dirname, "images", id);
      fs.mkdirSync(outPath, { recursive: true });

      const tasks = [icon, ...screenshots, ...ipadScreenshots].map(
        async (url) => {
          const { pathname } = new URL(url);
          const [fileUUID] = pathname
            .split("/")
            .filter((fragment) => fragment.includes(".jpg"));
          const fileStream = fs.createWriteStream(
            path.join(outPath, fileUUID),
            {
              recursive: true,
            }
          );
          https.get(url, (res) => res.pipe(fileStream));
          return once(fileStream, "finish");
        }
      );

      console.log("downloading", tasks.length, "images");

      await Promise.all(tasks);

      console.log("done");
    }
  } catch (error) {
    console.error(error);
  }
})();
