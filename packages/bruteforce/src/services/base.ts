/**
 * Base service class for credential brute forcing
 */
export interface Credentials {
  username: string;
  password: string;
}

export interface ServiceConfig {
  timeout?: number;
  requestOptions?: any;
  proxyAgent?: any;
}

export abstract class BaseService {
  protected config: ServiceConfig;

  constructor(config: ServiceConfig = {}) {
    this.config = config;
  }

  /**
   * Test a single credential against the service
   * @returns true if credentials are valid, false otherwise
   */
  abstract test(credentials: Credentials): Promise<boolean>;

  /**
   * Get service name
   */
  abstract getName(): string;

  /**
   * Close any open connections
   */
  async close(): Promise<void> {
    // Override if needed
  }
}
