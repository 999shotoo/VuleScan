import { BaseService, type Credentials, type ServiceConfig } from "./base.js";
import { SSHService, type SSHConfig } from "./ssh.js";
import { HTTPService, type HTTPConfig } from "./http.js";
import { FTPService, type FTPConfig } from "./ftp.js";
import { SMTPService, type SMTPConfig } from "./smtp.js";
import { POP3Service, type POP3Config } from "./pop3.js";
import { IMAPService, type IMAPConfig } from "./imap.js";
import { TelnetService, type TelnetConfig } from "./telnet.js";

export type ServiceType = "ssh" | "http" | "ftp" | "smtp" | "pop3" | "imap" | "telnet";

export type ServiceOptions =
  | SSHConfig
  | HTTPConfig
  | FTPConfig
  | SMTPConfig
  | POP3Config
  | IMAPConfig
  | TelnetConfig;

export function createService(
  type: ServiceType,
  config: ServiceOptions
): BaseService {
  switch (type) {
    case "ssh":
      return new SSHService(config as SSHConfig);
    case "http":
      return new HTTPService(config as HTTPConfig);
    case "ftp":
      return new FTPService(config as FTPConfig);
    case "smtp":
      return new SMTPService(config as SMTPConfig);
    case "pop3":
      return new POP3Service(config as POP3Config);
    case "imap":
      return new IMAPService(config as IMAPConfig);
    case "telnet":
      return new TelnetService(config as TelnetConfig);
    default:
      throw new Error(`Unknown service type: ${type}`);
  }
}

export { BaseService, type Credentials, type ServiceConfig };
