import net from "node:net";
import type { Credentials, ServiceConfig } from "./base.js";
import { BaseService } from "./base.js";

export interface TelnetConfig extends ServiceConfig {
  host: string;
  port?: number;
}

export class TelnetService extends BaseService {
  constructor(config: TelnetConfig) {
    super(config);
  }

  async test(credentials: Credentials): Promise<boolean> {
    return new Promise(resolve => {
      const telnetConfig = this.config as TelnetConfig;
      const socket = net.createConnection({
        host: telnetConfig.host,
        port: telnetConfig.port || 23
      });

      const timeout = this.config.timeout || 10000;
      let sentUser = false;
      let sentPass = false;
      let done = false;

      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        socket.destroy();
        resolve(ok);
      };

      const timer = setTimeout(() => finish(false), timeout);

      socket.on("data", chunk => {
        const response = chunk.toString().toLowerCase();

        if (!sentUser && (response.includes("login") || response.includes("username"))) {
          sentUser = true;
          socket.write(`${credentials.username}\r\n`);
          return;
        }

        if (sentUser && !sentPass && response.includes("password")) {
          sentPass = true;
          socket.write(`${credentials.password}\r\n`);
          return;
        }

        if (sentPass && (response.includes("#") || response.includes("$") || response.includes("welcome"))) {
          clearTimeout(timer);
          finish(true);
          return;
        }

        if (response.includes("denied") || response.includes("failed") || response.includes("incorrect")) {
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
    const telnetConfig = this.config as TelnetConfig;
    return `TELNET (${telnetConfig.host}:${telnetConfig.port || 23})`;
  }
}
