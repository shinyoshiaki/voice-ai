import { Audio2Rtp } from "../../../../libs/audio2rtp/src";

import { CallConnection } from "../domain/connection";
import { ChatLogManager } from "../domain/chat";
import { GptSession } from "../domain/gpt";
import { RecognizeVoice } from "../domain/recognize";
import { TtsSession } from "../domain/tts";
import { randomUUID } from "crypto";

export class SessionService {
  readonly id = randomUUID();

  private constructor(
    public connection: CallConnection,
    public audio2Rtp: Audio2Rtp,
    public recognizeVoice: RecognizeVoice,
    public chatLog: ChatLogManager,
    public tts: TtsSession,
    public gptSession: GptSession
  ) {}

  static async Create(connection: CallConnection) {
    const audio = await Audio2Rtp.Create();
    const recognizeVoice = await RecognizeVoice.Create();
    const chatLog = new ChatLogManager();
    const tts = new TtsSession(audio);
    const gptSession = new GptSession();

    return new SessionService(
      connection,
      audio,
      recognizeVoice,
      chatLog,
      tts,
      gptSession
    );
  }

  destroy() {
    // todo impl
  }
}
