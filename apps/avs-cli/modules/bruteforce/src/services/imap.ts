import net from "node:net";
import type { Credentials, ServiceConfig } from "./base.js";
import { BaseService } from "./base.js";

export interface IMAPConfig extends ServiceConfig {
  host: string;
  port?: number;
}

export class IMAPService extends BaseService {
  constructor(config: IMAPConfig) {
    super(config);
  }

  async test(credentials: Credentials): Promise<boolean> {
    return new Promise(resolve => {
      const imapConfig = this.config as IMAPConfig;
      const socket = net.createConnection({
        host: imapConfig.host,
        port: imapConfig.port || 143
      });

      const timeout = this.config.timeout || 10000;
      const tag = "a001";
      let done = false;
      let bannerSeen = false;

      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        socket.destroy();
        resolve(ok);
      };

      const timer = setTimeout(() => finish(false), timeout);

      socket.on("data", chunk => {
        const response = chunk.toString();

        if (!bannerSeen && /^\* OK/m.test(response)) {
          bannerSeen = true;
          socket.write(`${tag} LOGIN \"${credentials.username}\" \"${credentials.password}\"\r\n`);
          return;
        }

        if (new RegExp(`^${tag} OK`, "m").test(response)) {
          clearTimeout(timer);
          finish(true);
          return;
        }

        if (new RegExp(`^${tag} (NO|BAD)`, "m").test(response)) {
          clearTimeout(timer);
          finish(false);
        }
      });

      socket.on("error", () => {
        clearTimeout(timer);
        finish(false);
      });

      socket.on("end", () => {
        clearTimeout(timer);
        finish(false);
      });
    });
  }

  getName(): string {
    const imapConfig = this.config as IMAPConfig;
    return `IMAP (${imapConfig.host}:${imapConfig.port || 143})`;
  }
}
