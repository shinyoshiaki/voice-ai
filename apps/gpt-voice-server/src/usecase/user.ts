import { EventDisposer } from "rx.mini";
import { Recognized, Thinking } from "../../../../libs/gpt-voice-rpc/src";
import { ChatLogs } from "../domain/session/chat";
import { CallConnection } from "../domain/session/connection";
import { GptSession } from "../domain/session/gpt";
import { RecognizeVoice } from "../domain/session/recognize";

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
    this.connection.sendMessage<Recognized>({
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
