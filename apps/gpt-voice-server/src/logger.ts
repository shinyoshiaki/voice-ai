export const logLevelTypes = [
  "disable",
  "error",
  "warn",
  "info",
  "debug",
] as const;
export type LogLevel = (typeof logLevelTypes)[number];
export type LogFormat = "object" | "string";

export class Logger {
  static level: LogLevel = "debug";
  static format: LogFormat = "string";
  static onLog: (props: {
    level: string;
    timestamp: string;
    message: any[];
  }) => void = () => {};

  /**@internal */
  prefix: string;

  /**@internal */
  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /**@internal */
  debug = (...msg: any[]) => {
    this._log("debug", ...msg);
    return Date.now();
  };

  /**@internal */
  info = (...msg: any[]) => {
    this._log("info", ...msg);
    return Date.now();
  };

  /**@internal */
  warn = (...msg: any[]) => {
    this._log("warn", ...msg);
  };

  /**@internal */
  error = (...msg: any[]) => {
    this._log("error", ...msg);
  };

  /**@internal */
  elapsed = (timestamp: number, ...msg: any[]) => {
    const elapsed = Date.now() - timestamp;
    this._log("info", `elapsed ms:${elapsed}`, ...msg);
  };

  private _log(level: LogLevel, ...msg: any[]) {
    const logType = logLevelTypes.indexOf(level);
    const logLevel = logLevelTypes.indexOf(Logger.level);

    if (logLevel >= logType) {
      const timestamp =
        new Date(Date.now() + 60 * 9 * 60_000).toISOString() + "+JST";

      const parsed = [this.prefix, ...msg].map((m) => {
        if (m instanceof Error) {
          if ((m as any).toJSON) {
            return (m as any).toJSON() as object;
          }
          return { name: m.name, message: m.message, stack: m.stack };
        }
        if (typeof m === "object") {
          try {
            return JSON.parse(JSON.stringify(m)) as object;
          } catch (error) {
            return "json error";
          }
        }

        return m as object;
      });
      msg = parsed;

      let log = [timestamp, level, ...msg];
      if (Logger.format === "string") {
        log = [timestamp + " " + level + " " + JSON.stringify(msg)];
      }

      switch (level) {
        case "debug":
          console.log(...log);
          break;
        case "info":
          console.info(...log);
          break;
        case "warn":
          console.warn(...log);
          break;
        case "error":
          console.error(...log);
          break;
      }

      Logger.onLog({ timestamp, level, message: msg });
    }
  }

  /**@internal */
  createBlock(info: object) {
    return {
      warn: (...msg: any[]) => {
        this.warn({ ...info }, ...msg);
      },
      debug: (...msg: any[]) => {
        this.debug({ ...info }, ...msg);
      },
      info: (...msg: any[]) => {
        this.info({ ...info }, ...msg);
      },
      error: (...msg: any[]) => {
        this.error({ ...info }, ...msg);
      },
    };
  }
}
