import { Client } from "ssh2";
import type { Credentials, ServiceConfig } from "./base.js";
import { BaseService } from "./base.js";

export interface SSHConfig extends ServiceConfig {
  host: string;
  port?: number;
}

export class SSHService extends BaseService {
  constructor(config: SSHConfig) {
    super(config);
  }

  async test(credentials: Credentials): Promise<boolean> {
    return new Promise((resolve) => {
      const conn = new Client();
      const timeout = this.config.timeout || 10000;
      const sshConfig = this.config as SSHConfig;

      const timer = setTimeout(() => {
        conn.end();
        resolve(false);
      }, timeout);

      conn.on("ready", () => {
        clearTimeout(timer);
        conn.end();
        resolve(true);
      });

      conn.on("error", () => {
        clearTimeout(timer);
        resolve(false);
      });

      try {
        conn.connect({
          host: sshConfig.host,
          port: sshConfig.port || 22,
          username: credentials.username,
          password: credentials.password,
          readyTimeout: timeout,
          algorithms: {
            serverHostKey: ["ssh-rsa", "ssh-dss"]
          }
        });
      } catch {
        clearTimeout(timer);
        resolve(false);
      }
    });
  }

  getName(): string {
    const sshConfig = this.config as SSHConfig;
    return `SSH (${sshConfig.host}:${sshConfig.port || 22})`;
  }
}
