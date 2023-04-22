import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { config } from "../config";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { IncomingMessage } from "http";
import { Event } from "rx.mini";

const conf = new Configuration({
  apiKey: config.openai,
});

export class GptSession {
  openai = new OpenAIApi(conf);
  conversationHistory: ChatCompletionRequestMessage[] = [];
  onResponse = new Event<[{ message: string; end?: boolean }]>();
  private messageBuffer: string[] = [];
  private marks = ["、", "。", "・"];

  private get systemConversation(): ChatCompletionRequestMessage[] {
    return [];
  }

  private response(message: string, end = false) {
    this.messageBuffer.push(message);
    if (this.marks.find((mark) => message.includes(mark)) || end) {
      this.onResponse.execute({ message: this.messageBuffer.join(""), end });
      this.messageBuffer = [];
    }
  }

  async request(message: string): Promise<void> {
    this.conversationHistory.push({ role: "user", content: message });

    const completion = await this.openai.createChatCompletion(
      {
        model: "gpt-3.5-turbo",
        messages: [...this.systemConversation, ...this.conversationHistory],
        stream: true,
      },
      { responseType: "stream" }
    );
    const stream = completion.data as unknown as IncomingMessage;
    for await (const chunk of stream as unknown as Promise<Buffer>[]) {
      const lines: string[] = chunk
        .toString("utf8")
        .split("\n")
        .filter((line: string) => line.trim().startsWith("data: "));

      for (const line of lines) {
        const message = line.replace(/^data: /, "");
        if (message === "[DONE]") {
          this.response("", true);
          return;
        }

        const json = JSON.parse(message);
        const token: string | undefined = json.choices[0].delta.content;
        if (token) {
          this.response(token);
        }
      }
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}
