import { scanDirectory } from "./index.js";

async function run() {
  const result = await scanDirectory(
    "https://example.com",
    "./wordlist.txt"
  );

  console.log(JSON.stringify(result, null, 2));
}

run();
