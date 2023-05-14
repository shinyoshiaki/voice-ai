import { Audio2Rtp } from "../../../../libs/audio2rtp/src";

import { CallConnection } from "../domain/connection";
import { ChatLogManager } from "../domain/chat";
import { RecognizeVoice } from "../domain/recognize";
import { TtsSession } from "../domain/tts";
import { randomUUID } from "crypto";
import { AssistantModel } from "../domain/model/base";
import { assistantModelFactory } from "../domain/model/factory";

export class SessionService {
  readonly id = randomUUID();

  private constructor(
    public connection: CallConnection,
    public audio2Rtp: Audio2Rtp,
    public recognizeVoice: RecognizeVoice,
    public chatLog: ChatLogManager,
    public tts: TtsSession,
    public gptSession: AssistantModel
  ) {}

  static async Create(connection: CallConnection, model: string) {
    const audio = await Audio2Rtp.Create();
    const recognizeVoice = await RecognizeVoice.Create();
    const chatLog = new ChatLogManager();
    const tts = new TtsSession(audio);
    const gptSession = assistantModelFactory(model);

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
