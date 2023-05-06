import { EventDisposer } from "rx.mini";
import { Recognized, Thinking } from "../../../../libs/gpt-voice-rpc/src";
import { ChatLogs } from "./chat";
import { CallConnection } from "./connection";
import { GptSession } from "./gpt";
import { RecognizeVoice } from "./recognize";

export class User {
  private disposer = new EventDisposer();

  constructor(
    private connection: CallConnection,
    private chatLog: ChatLogs,
    private gptSession: GptSession,
    private recognizeVoice: RecognizeVoice
  ) {
    connection.onRtp
      .subscribe(async (rtp) => {
        await recognizeVoice.inputRtp(rtp);
      })
      .disposer(this.disposer);
    recognizeVoice.onRecognized
      .subscribe((recognized) => {
        this.recognized(recognized);
      })
      .disposer(this.disposer);

    recognizeVoice.onRecognizing
      .subscribe((sentence) => {
        this.recognizing(sentence);
      })
      .disposer(this.disposer);
  }

  private recognizing(sentence: string) {
    this.connection.sendMessage<Recognized>({
      type: "recognized",
      payload: this.chatLog.input({
        message: sentence,
        role: "user",
        overwrite: true,
      }),
    });
  }

  private recognized(sentence: string) {
    try {
      this.connection.sendMessage<Recognized>({
        type: "recognized",
        payload: this.chatLog.endInput(sentence),
      });

      this.gptSession.request(sentence).catch((e) => console.error(e));

      this.recognizeVoice.muted = true;
      this.connection.sendMessage<Thinking>({
        type: "thinking",
      });
    } catch (error) {}
  }

  destroy() {
    this.disposer.dispose();
  }
}
