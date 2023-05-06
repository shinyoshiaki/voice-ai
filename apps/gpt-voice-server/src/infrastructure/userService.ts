import { Audio2Rtp } from "../../../../libs/audio2rtp/src";
import { Assistant } from "../domain/assistant";
import { User } from "../domain/user";
import { CallConnection } from "../domain/connection";
import { ChatLogs } from "../domain/chat";
import { GptSession } from "../domain/gpt";
import { RecognizeVoice } from "../domain/recognize";
import { TtsSession } from "../domain/tts";
import { randomUUID } from "crypto";

export class UserService {
  readonly id = randomUUID();
  private constructor(
    public user: User,
    public assistant: Assistant,
    public connection: CallConnection
  ) {}

  static async Create(connection: CallConnection) {
    const audio = await Audio2Rtp.Create();
    const recognizeVoice = await RecognizeVoice.Create();
    const chatLog = new ChatLogs();
    const tts = new TtsSession(audio);
    const gptSession = new GptSession();

    const userUsecase = new User(
      connection,
      chatLog,
      gptSession,
      recognizeVoice
    );
    const assistantUsecase = new Assistant(
      connection,
      chatLog,
      gptSession,
      recognizeVoice,
      audio,
      tts
    );

    return new UserService(userUsecase, assistantUsecase, connection);
  }

  destroy() {
    this.user.destroy();
    this.assistant.destroy();
  }
}
