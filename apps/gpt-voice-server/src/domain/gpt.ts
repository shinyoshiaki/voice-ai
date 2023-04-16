import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { config } from "../config";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const conf = new Configuration({
  apiKey: config.openai,
});

export class GptSession {
  openai = new OpenAIApi(conf);
  conversationHistory: ChatCompletionRequestMessage[] = [];

  private get systemConversation(): ChatCompletionRequestMessage[] {
    return [
      {
        role: "user",
        content: `現在時刻は ${format(Date.now(), "HH時mm分", {
          locale: ja,
        })} です。時刻を聞かれたらそう答えてください`,
      },
    ];
  }

  async request(message: string): Promise<string> {
    this.conversationHistory.push({ role: "user", content: message });

    const completion = await this.openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [...this.systemConversation, ...this.conversationHistory],
    });
    const [choice] = completion.data.choices;
    if (!choice.message) {
      return "";
    }
    this.conversationHistory.push(choice.message);
    const response = choice.message.content;

    console.log("ai", response);
    return response;
  }

  clearHisotry() {
    this.conversationHistory = [];
  }
}
