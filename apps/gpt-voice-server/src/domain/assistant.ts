import { EventDisposer } from "rx.mini";
import { CallConnection } from "./connection";
import { ChatLogs } from "./chat";
import { GptSession } from "./gpt";
import { RecognizeVoice } from "./recognize";
import { Audio2Rtp } from "../../../../libs/audio2rtp/src";
import {
  Response,
  Speaking,
  Waiting,
} from "../../../../libs/gpt-voice-rpc/src";
import { TtsSession } from "./tts";

export class Assistant {
  private disposer = new EventDisposer();

  constructor(
    public connection: CallConnection,
    public chatLog: ChatLogs,
    public gptSession: GptSession,
    public recognizeVoice: RecognizeVoice,
    public audio: Audio2Rtp,
    public tts: TtsSession
  ) {
    gptSession.onResponse
      .subscribe(({ message, end }) => {
        this.text2speak(message, end);
      })
      .disposer(this.disposer);
    audio.onRtp
      .subscribe((rtp) => {
        connection.sendRtp(rtp);
      })
      .disposer(this.disposer);
    audio.onSpeakChanged
      .subscribe((speaking) => {
        if (speaking) {
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

  async cancelSpeaking() {
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
