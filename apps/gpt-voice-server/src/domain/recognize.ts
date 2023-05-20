import Event from "rx.mini";
import {
  RecognizeSession,
  SessionFactory,
} from "../../../../libs/rtp2text/src";
import { config } from "../config";
import { RtpPacket } from "werift";

const sessionFactory = new SessionFactory({
  modelPath: config.modelPath,
});
const ngWordsStartWith = [
  "えーっと",
  "えっとー",
  "えーと",
  "えっと",
  "えー",
  "ん",
]
  .sort((a, b) => a.length - b.length)
  .reverse();

export class RecognizeVoice {
  private session!: RecognizeSession;
  onRecognized = new Event<[string]>();
  onRecognizing = new Event<[string]>();
  private _muted = false;

  setMuted(muted: boolean) {
    this._muted = muted;
  }

  private _paused = false;
  setPaused(paused: boolean) {
    this._paused = paused;
    if (!paused) {
      if (this.textBuffer) {
        this.onRecognized.execute(this.textBuffer);
        this.textBuffer = "";
      }
    }
  }
  private textBuffer = "";

  private async init() {
    this.session = await sessionFactory.create();
    this.session.onText.subscribe(async (res) => {
      if (this._muted) {
        return;
      }

      if (res.partial) {
        const recognizing = res.partial;
        if (recognizing.length === 1) {
          return;
        }

        this.onRecognizing.execute(this.textBuffer + recognizing);
      }

      if (res.result) {
        let recognized = res.result;

        if (recognized.length === 1) {
          return;
        }

        for (const ng of ngWordsStartWith) {
          if (recognized.startsWith(ng)) {
            recognized = recognized.slice(ng.length);
            break;
          }
        }

        this.textBuffer += recognized;

        if (this._paused) {
          return;
        }

        this.onRecognized.execute(this.textBuffer);
        this.textBuffer = "";
      }
    });
  }

  static async Create() {
    const recognize = new RecognizeVoice();
    await recognize.init();
    return recognize;
  }

  async inputRtp(rtp: RtpPacket) {
    if (this._muted) {
      return;
    }
    await this.session.inputRtp(rtp);
  }

  stop() {
    this.session.stop();
    this.onRecognized.allUnsubscribe();
    this.onRecognizing.allUnsubscribe();
  }
}
