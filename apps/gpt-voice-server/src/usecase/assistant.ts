import { EventDisposer } from "rx.mini";
import { CallConnection } from "../domain/connection";
import { ChatLogs } from "../domain/chat";
import { GptSession } from "../domain/gpt";
import { RecognizeVoice } from "../domain/recognize";
import { Audio2Rtp } from "../../../../libs/audio2rtp/src";
import {
  ChatFunctions,
  Response,
  Speaking,
  Waiting,
} from "../../../../libs/rpc/src";
import { TtsClient } from "../domain/tts";

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
    connection.onMessage
      .subscribe(async (s) => {
        const { type } = JSON.parse(s as string) as ChatFunctions;
        switch (type) {
          case "clearHistory":
            {
              this.clearHistory();
            }
            break;
          case "cancel":
            {
              await this.cancel();
            }
            break;
        }
      })
      .disposer(this.disposer);
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

  private clearHistory() {
    this.gptSession.clearHistory();
    this.chatLog.clear();
  }

  private async cancel() {
    this.gptSession.stop();
    await this.audio.stop();
    this.chatLog.cancel();
  }

  private text2speak(message: string, end?: boolean) {
    this.tts
      .speak(message)
      .then(() => {
        if (!this.gptSession.stopped) {
          const rpc: Response = {
            type: "response",
            payload: this.chatLog.input({ message, role: "assistant" }),
          };
          this.connection.send(rpc);

          if (end) {
            this.chatLog.input({ message, role: "assistant" });
            this.chatLog.endInput();
          }
        }
      })
      .catch(() => {});
  }

  private speaking() {
    this.recognizeVoice.muted = true;
    const message: Speaking = { type: "speaking" };
    this.connection.send(message);
  }

  private waiting() {
    this.recognizeVoice.muted = false;
    const message: Waiting = { type: "waiting" };
    this.connection.send(message);
  }

  destroy() {
    this.disposer.dispose();
  }
}
