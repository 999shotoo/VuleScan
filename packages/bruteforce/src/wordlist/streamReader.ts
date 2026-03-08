import fs from "fs";
import readline from "readline";

export async function* streamWordlist(path: string): AsyncGenerator<string> {
  const stream = fs.createReadStream(path, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const word = line.trim();
    if (word) yield word;
  }
}
