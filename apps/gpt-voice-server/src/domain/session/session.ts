import { Audio2Rtp } from "../../../../../libs/audio2rtp/src";
import { AssistantUsecase } from "../../usecase/assistant";
import { UserUsecase } from "../../usecase/user";
import { CallConnection } from "./connection";
import { ChatLogs } from "./chat";
import { GptSession } from "./gpt";
import { RecognizeVoice } from "./recognize";
import { TtsClient } from "./tts";
import { randomUUID } from "crypto";

export class UserSession {
  readonly id = randomUUID();
  private constructor(
    private userUsecase: UserUsecase,
    private assistantUsecase: AssistantUsecase,
    public connection: CallConnection
  ) {}

  static async Create() {
    const audio = await Audio2Rtp.Create();
    const recognizeVoice = await RecognizeVoice.Create();
    const connection = new CallConnection();
    const chatLog = new ChatLogs();
    const tts = new TtsClient(audio);
    const gptSession = new GptSession();

    const userUsecase = new UserUsecase(
      connection,
      chatLog,
      gptSession,
      recognizeVoice
    );
    const assistantUsecase = new AssistantUsecase(
      connection,
      chatLog,
      gptSession,
      recognizeVoice,
      audio,
      tts
    );

    return new UserSession(userUsecase, assistantUsecase, connection);
  }

  destroy() {
    this.userUsecase.destroy();
    this.assistantUsecase.destroy();
  }
}
