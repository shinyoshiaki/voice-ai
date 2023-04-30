import Event from "rx.mini";
import { Session, SessionFactory } from "../../../../libs/rtp2text/src";
import { config } from "../config";
import { RtpPacket } from "werift";

const sessionFactory = new SessionFactory({
  modelPath: config.modelPath,
});
const ngWords = ["えーっと", "えっとー", "えーと", "えー"]
  .sort((a, b) => a.length - b.length)
  .reverse();

export class RecognizeVoice {
  session!: Session;
  onRecognized = new Event<[string]>();
  onRecognizing = new Event<[string]>();
  muted = false;
  private constructor() {}

  private async init() {
    this.session = await sessionFactory.create();
    this.session.onText.subscribe(async (res) => {
      if (this.muted) {
        return;
      }

      if (res.result) {
        let recognized = res.result;

        if (recognized.length === 1) {
          return;
        }
        if (ngWords.includes(recognized)) {
          return;
        }
        if (recognized[0] === "ん") {
          recognized = recognized.slice(1);
        }

        for (const ng of ngWords) {
          if (recognized.startsWith(ng)) {
            recognized = recognized.slice(ng.length);
            break;
          }
        }

        this.onRecognized.execute(recognized);
      }

      if (res.partial) {
        const recognizing = res.partial;
        if (recognizing.length === 1) {
          return;
        }
        if (ngWords.includes(recognizing)) {
          return;
        }

        this.onRecognizing.execute(recognizing);
      }
    });
  }

  static async Create() {
    const recognize = new RecognizeVoice();
    await recognize.init();
    return recognize;
  }

  async inputRtp(rtp: RtpPacket) {
    await this.session.inputRtp(rtp);
  }
}
