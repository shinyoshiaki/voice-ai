export class ChatLogs {
  logs: ChatLog[] = [];

  cancel() {
    this.logs.pop();
  }

  input({
    message,
    role,
    overwrite,
  }: {
    message: string;
    role: ChatLog["role"];
    overwrite?: boolean;
  }) {
    overwrite = overwrite ?? false;

    const last = this.logs.at(-1);
    if (last && last.completed === false) {
      if (overwrite) {
        last.content = message;
      } else {
        last.content += message;
      }
      return last;
    } else {
      const log = {
        role,
        content: message,
        completed: false,
        index: this.logs.length,
      };
      this.logs.push(log);
      return log;
    }
  }

  endInput(completeMessage?: string) {
    const last = this.logs.at(-1)!;
    last.completed = true;
    if (completeMessage) {
      last.content = completeMessage;
    }
    return last;
  }

  clear() {
    this.logs = [];
  }
}

export interface ChatLog {
  role: "user" | "assistant";
  content: string;
  completed: boolean;
  index: number;
}
