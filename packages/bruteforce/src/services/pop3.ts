import net from "node:net";
import type { Credentials, ServiceConfig } from "./base.js";
import { BaseService } from "./base.js";

export interface POP3Config extends ServiceConfig {
  host: string;
  port?: number;
}

export class POP3Service extends BaseService {
  constructor(config: POP3Config) {
    super(config);
  }

  async test(credentials: Credentials): Promise<boolean> {
    return new Promise(resolve => {
      const pop3Config = this.config as POP3Config;
      const socket = net.createConnection({
        host: pop3Config.host,
        port: pop3Config.port || 110
      });

      const timeout = this.config.timeout || 10000;
      let stage: "banner" | "user" | "pass" = "banner";
      let done = false;

      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        socket.destroy();
        resolve(ok);
      };

      const timer = setTimeout(() => finish(false), timeout);

      socket.on("data", chunk => {
        const response = chunk.toString();

        if (response.startsWith("-ERR")) {
          clearTimeout(timer);
          finish(false);
          return;
        }

        if (stage === "banner" && response.startsWith("+OK")) {
          stage = "user";
          socket.write(`USER ${credentials.username}\r\n`);
          return;
        }

        if (stage === "user" && response.startsWith("+OK")) {
          stage = "pass";
          socket.write(`PASS ${credentials.password}\r\n`);
          return;
        }

        if (stage === "pass" && response.startsWith("+OK")) {
          clearTimeout(timer);
          finish(true);
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
    const pop3Config = this.config as POP3Config;
    return `POP3 (${pop3Config.host}:${pop3Config.port || 110})`;
  }
}
