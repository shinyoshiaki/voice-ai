import { EventDisposer } from "rx.mini";
import { Recognized, Thinking } from "../../../../libs/rpc/src";
import { ChatLogs } from "../domain/chat";
import { CallConnection } from "../domain/connection";
import { GptSession } from "../domain/gpt";
import { RecognizeVoice } from "../domain/recognize";

export class UserUsecase {
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

  recognizing(sentence: string) {
    this.connection.send<Recognized>({
      type: "recognized",
      payload: this.chatLog.input({
        message: sentence,
        role: "user",
        overwrite: true,
      }),
    });
  }

  recognized(sentence: string) {
    try {
      this.connection.send<Recognized>({
        type: "recognized",
        payload: this.chatLog.endInput(sentence),
      });

      this.gptSession.request(sentence).catch((e) => console.error(e));

      this.recognizeVoice.muted = true;
      this.connection.send<Thinking>({
        type: "thinking",
      });
    } catch (error) {}
  }

  destroy() {
    this.disposer.dispose();
  }
}
