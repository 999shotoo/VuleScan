export { scanDirectory } from "./scanDirectory.js";
export { ProxyManager } from "./network/proxyManager.js";

export type {
  Result,
  ScanOptions,
  ScanInfo,
  Output
} from "./scanDirectory.js";

export type {
  ProxyOptions,
  ProxyMode,
  ProxyRotate
} from "./network/proxyManager.js";

export { InvalidInputError, FileSystemError } from "./errors.js";
