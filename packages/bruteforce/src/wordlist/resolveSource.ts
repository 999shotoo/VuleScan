import { streamWordlist } from "./streamReader.js";
import type { RequestOptions } from "../network/proxyManager.js";
import { WordSource } from "./types.js";

export async function* resolveWordSource(
  source: WordSource,
  requestOptions?: RequestOptions
): AsyncGenerator<string> {
  if (source.type === "file") {
    yield* streamWordlist(source.path);
  }

  if (source.type === "array") {
    for (const word of source.words) {
      if (word.trim()) yield word.trim();
    }
  }

  if (source.type === "generator") {
    yield* source.generator(requestOptions);
  }
}
