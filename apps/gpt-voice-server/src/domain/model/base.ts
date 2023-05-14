import { ChatCompletionRequestMessage } from "openai";
import Event from "rx.mini";

export abstract class AssistantModel {
  static readonly modelName: string;
  conversationHistory: ChatCompletionRequestMessage[] = [];
  onResponse = new Event<[{ message: string; end?: boolean }]>();
  stopped = false;
  abstract stop(): void;
  abstract request(message: string): Promise<void>;
  abstract clearHistory(): void;
  abstract importHistory(history: ChatCompletionRequestMessage[]): void;
}
