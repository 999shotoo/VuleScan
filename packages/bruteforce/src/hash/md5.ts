import crypto from "crypto";

export const md5Hash = (value: string): string =>
  crypto.createHash("md5").update(value).digest("hex");
