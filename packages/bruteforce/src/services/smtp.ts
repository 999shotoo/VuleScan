import net from "node:net";
import type { Credentials, ServiceConfig } from "./base.js";
import { BaseService } from "./base.js";

export interface SMTPConfig extends ServiceConfig {
  host: string;
  port?: number;
}

export class SMTPService extends BaseService {
  constructor(config: SMTPConfig) {
    super(config);
  }

  async test(credentials: Credentials): Promise<boolean> {
    return new Promise(resolve => {
      const smtpConfig = this.config as SMTPConfig;
      const socket = net.createConnection({
        host: smtpConfig.host,
        port: smtpConfig.port || 25
      });

      const timeout = this.config.timeout || 10000;
      let stage: "greeting" | "ehlo" | "auth" | "user" | "pass" = "greeting";
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

        if (response.startsWith("235")) {
          clearTimeout(timer);
          finish(true);
          return;
        }

        if (response.startsWith("535") || response.startsWith("530") || response.startsWith("454")) {
          clearTimeout(timer);
          finish(false);
          return;
        }

        if (stage === "greeting" && /^220/m.test(response)) {
          stage = "ehlo";
          socket.write("EHLO localhost\r\n");
          return;
        }

        if (stage === "ehlo" && /^250/m.test(response)) {
          stage = "auth";
          socket.write("AUTH LOGIN\r\n");
          return;
        }

        if (stage === "auth" && /^334/m.test(response)) {
          stage = "user";
          socket.write(`${Buffer.from(credentials.username).toString("base64")}\r\n`);
          return;
        }

        if (stage === "user" && /^334/m.test(response)) {
          stage = "pass";
          socket.write(`${Buffer.from(credentials.password).toString("base64")}\r\n`);
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
    const smtpConfig = this.config as SMTPConfig;
    return `SMTP (${smtpConfig.host}:${smtpConfig.port || 25})`;
  }
}
