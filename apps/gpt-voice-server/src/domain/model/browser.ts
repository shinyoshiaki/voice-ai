import { OpenAI } from "langchain/llms/openai";
import {
  AgentExecutor,
  initializeAgentExecutorWithOptions,
} from "langchain/agents";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Serper } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";
import { AssistantModel } from "./base";
import { config } from "../../config";
import clarinet from "clarinet";

export class Browser extends AssistantModel {
  static modelName: string = "Browser";
  modelName: string = Browser.modelName;
  executor!: AgentExecutor;
  // アシスタントの中間回答(区切り文字単位)を保持するバッファ
  private messageBuffer = "";
  // アシスタントの回答を保持するバッファ
  private sentenceBuffer = "";
  private marks = [
    "、",
    "。",
    "・",
    "！",
    "?",
    "？",
    "：",
    ". ",
    "-",
    ".",
    `"`,
    "'",
    "{",
    "}",
    ":",
  ];
  private parser = clarinet.parser();
  currentParserKey = "";

  constructor() {
    super();

    this.parser.onkey = (key) => {
      console.log("onkey", key);
      this.currentParserKey = key;
    };
    this.parser.oncloseobject = () => {
      this.currentParserKey = "";
    };
  }

  async setup() {
    const model = new OpenAI({
      temperature: 0,
      openAIApiKey: config.openai,
      modelName: "gpt-3.5-turbo",
      streaming: true,
      verbose: true,
    });
    const embeddings = new OpenAIEmbeddings({ openAIApiKey: config.openai });
    const tools = [
      new Serper(config.serper, {
        hl: "ja",
        gl: "jp",
      }),
      new WebBrowser({ model, embeddings }),
    ];

    this.executor = await initializeAgentExecutorWithOptions(tools, model, {
      agentType: "chat-conversational-react-description",
      agentArgs: { systemMessage: "Answer should be in Japanese." },
      verbose: false,
    });
  }

  stop(): void {}

  private response(word: string, end = false) {
    this.messageBuffer += word;
    if (this.marks.find((mark) => word.includes(mark)) || end) {
      this.sentenceBuffer += this.messageBuffer;
      this.onResponse.execute({ message: this.messageBuffer, end });
      this.messageBuffer = "";

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

  async request(message: string): Promise<void> {
    this.conversationHistory.push({ role: "user", content: message });
    await this.executor.call({ input: message }, [
      {
        handleLLMNewToken: (token) => {
          this.parser.write(token);

          if (this.currentParserKey === "action_input") {
            this.response(token);
          }
        },
      },
    ]);

    this.response("", true);
  }
}
