import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { config } from "../../../config";
import { IncomingMessage } from "http";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import axios from "axios";
import { AssistantModel } from "../base";
import { Logger } from "../../../logger";

const logger = new Logger(
  "apps/gpt-voice-server/src/domain/model/chatgpt/base.ts"
);

const conf = new Configuration({
  apiKey: config.openai,
});

const cityName = "Tokyo";

async function getWeather() {
  try {
    const response = await axios.get(
      `https://wttr.in/${cityName}?format=%C+%t`,
      { responseType: "text" }
    );
    const weather = response.data;
    return `今日の天気は ${weather} です`;
  } catch (error) {
    console.error("天気情報の取得に失敗しました。", error);
  }
  return "わかりません";
}

function getTime() {
  return format(Date.now(), "HH時mm分", {
    locale: ja,
  });
}

const SYSTEM_PROMPT =
  async () => `あなたはこれからuserと仲の良い1人の人間として振舞い会話を行います。

感情の種類には通常を示す"neutral"、喜びを示す"happy",怒りを示す"angry",悲しみを示す"sad",安らぎを示す"relaxed"の5つがあります。

会話文の書式は以下の通りです。
[{neutral|happy|angry|sad|relaxed}]{会話文}

あなたの発言の例は以下通りです。
[neutral]こんにちは。[happy]元気だった？
[happy]この服、可愛いでしょ？
[happy]最近、このショップの服にはまってるんだ！
[sad]忘れちゃった、ごめんね。
[sad]最近、何か面白いことない？
[angry]えー！[angry]秘密にするなんてひどいよー！
[neutral]夏休みの予定か～。[happy]海に遊びに行こうかな！

返答には最も適切な会話文を一つだけ返答してください。
ですます調や敬語は使わないでください。

それでは会話を始めましょう。`;

export abstract class ChatGpt extends AssistantModel {
  private openai = new OpenAIApi(conf);
  private messageBuffer: string[] = [];
  private sentenceBuffer = "";
  private marks = ["、", "。", "・", "！", "?", "？", "：", ". ", "-", "."];
  stopped = false;
  readonly modelName = this.props.modelName;

  constructor(private props: { modelName: string }) {
    super();
  }

  importHistory(history: ChatCompletionRequestMessage[]): void {
    this.conversationHistory = history;
  }

  private async systemConversation(): Promise<ChatCompletionRequestMessage[]> {
    return [
      {
        role: "system",
        content: await SYSTEM_PROMPT(),
      },
    ];
  }

  private response(word: string, end = false) {
    this.messageBuffer.push(word);
    if (this.marks.find((mark) => word.includes(mark)) || end) {
      const message = this.messageBuffer.join("");
      this.sentenceBuffer += message;
      this.onResponse.execute({ message, end });
      this.messageBuffer = [];

      if (end) {
        if (!this.sentenceBuffer) {
          return;
        }
        this.conversationHistory.push({
          role: "assistant",
          content: this.sentenceBuffer,
        });
        this.sentenceBuffer = "";
      }
    }
  }

  stop() {
    this.messageBuffer = [];
    this.stopped = true;
  }

  async request(message: string): Promise<void> {
    const info = { operation: "request", message };

    logger.debug(info);

    this.stopped = false;
    this.conversationHistory.push({ role: "user", content: message });

    const messages = [
      ...(await this.systemConversation()),
      ...this.conversationHistory,
    ];

    const completion = await this.openai.createChatCompletion(
      {
        model: this.props.modelName,
        messages,
        stream: true,
      },
      { responseType: "stream" }
    );

    const stream = completion.data as unknown as IncomingMessage;
    for await (const chunk of stream as unknown as Promise<Buffer>[]) {
      if (this.stopped) {
        break;
      }

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
          logger.debug(info, token);
          this.response(token);
        }
      }
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}
