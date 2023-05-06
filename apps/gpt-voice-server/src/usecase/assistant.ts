import { EventDisposer } from "rx.mini";
import { CallConnection } from "../domain/connection";
import { ChatLogs } from "../domain/session/chat";
import { GptSession } from "../domain/session/gpt";
import { RecognizeVoice } from "../domain/session/recognize";
import { Audio2Rtp } from "../../../../libs/audio2rtp/src";
import {
  Response,
  Speaking,
  Waiting,
} from "../../../../libs/gpt-voice-rpc/src";
import { TtsClient } from "../domain/session/tts";

export class AssistantUsecase {
  private disposer = new EventDisposer();

  constructor(
    private connection: CallConnection,
    private chatLog: ChatLogs,
    private gptSession: GptSession,
    private recognizeVoice: RecognizeVoice,
    private audio: Audio2Rtp,
    private tts: TtsClient
  ) {
    gptSession.onResponse
      .queuingSubscribe(async ({ message, end }) => {
        this.text2speak(message, end);
      })
      .disposer(this.disposer);
    audio.onRtp
      .subscribe((rtp) => {
        connection.sendRtp(rtp);
      })
      .disposer(this.disposer);
    audio.onSpeakChanged
      .subscribe(() => {
        if (audio.speaking) {
          this.speaking();
        } else {
          this.waiting();
        }
      })
      .disposer(this.disposer);
  }

  clearHistory() {
    this.gptSession.clearHistory();
    this.chatLog.clear();
  }

  async cancel() {
    this.gptSession.stop();
    await this.audio.stop();
    this.chatLog.cancel();
    this.waiting();
  }

  destroy() {
    this.disposer.dispose();
  }

  private text2speak(message: string, end?: boolean) {
    this.tts
      .speak(message)
      .then(() => {
        if (!this.gptSession.stopped) {
          this.connection.sendMessage<Response>({
            type: "response",
            payload: this.chatLog.input({ message, role: "assistant" }),
          });

          if (end) {
            this.chatLog.input({ message, role: "assistant" });
            this.chatLog.endInput();
            this.connection.sendMessage<Waiting>({ type: "waiting" });
          }
        }
      })
      .catch(() => {});
  }

  private speaking() {
    this.recognizeVoice.muted = true;
    this.connection.sendMessage<Speaking>({ type: "speaking" });
  }

  private waiting() {
    this.recognizeVoice.muted = false;
    this.connection.sendMessage<Waiting>({ type: "waiting" });
  }
}
