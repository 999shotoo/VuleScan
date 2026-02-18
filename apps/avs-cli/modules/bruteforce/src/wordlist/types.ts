import type { RequestOptions } from "../network/proxyManager.js";

export type WordSource =
  | { type: "file"; path: string }
  | { type: "array"; words: string[] }
  | {
      type: "generator";
      generator: (requestOptions?: RequestOptions) => AsyncGenerator<string>;
    };
