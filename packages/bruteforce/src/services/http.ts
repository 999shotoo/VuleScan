import type { Credentials, ServiceConfig } from "./base.js";
import { BaseService } from "./base.js";

export interface HTTPConfig extends ServiceConfig {
  url: string;
  statusCode?: number;
  method?: "GET" | "POST";
}

export class HTTPService extends BaseService {
  constructor(config: HTTPConfig) {
    super(config);
  }

  async test(credentials: Credentials): Promise<boolean> {
    try {
      const auth = Buffer.from(
        `${credentials.username}:${credentials.password}`
      ).toString("base64");

      const controller = new AbortController();
      const timeout = this.config.timeout || 10000;
      const timer = setTimeout(() => controller.abort(), timeout);
      
      const httpConfig = this.config as HTTPConfig;
      const fetchInit: any = {
        method: httpConfig.method || "GET",
        headers: {
          Authorization: `Basic ${auth}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        signal: controller.signal
      };

      // Only add agent if available and in Node.js environment
      if (this.config.requestOptions?.agent) {
        fetchInit.agent = this.config.requestOptions.agent;
      }

      const response = await fetch(httpConfig.url, fetchInit);

      clearTimeout(timer);

      // Check for successful response (not 401/403)
      return response.status !== 401 && response.status !== 403;
    } catch {
      return false;
    }
  }

  getName(): string {
    const httpConfig = this.config as HTTPConfig;
    return `HTTP (${httpConfig.url})`;
  }
}
