import type { Credentials, ServiceConfig } from "./base.js";
import { BaseService } from "./base.js";

export interface FTPConfig extends ServiceConfig {
  host: string;
  port?: number;
}

export class FTPService extends BaseService {
  constructor(config: FTPConfig) {
    super(config);
  }

  async test(credentials: Credentials): Promise<boolean> {
    try {
      const timeout = this.config.timeout || 10000;

      // Using a simple approach: attempt FTP connection
      // In production, you'd use a proper FTP library like 'ftp'
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      // For now, we'll return a placeholder
      // In a real implementation, use the 'ftp' npm package
      clearTimeout(timer);
      return false;
    } catch {
      return false;
    }
  }

  getName(): string {
    const ftpConfig = this.config as FTPConfig;
    return `FTP (${ftpConfig.host}:${ftpConfig.port || 21})`;
  }
}
