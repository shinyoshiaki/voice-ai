import { OpusEncoder } from "@discordjs/opus";
import { randomUUID } from "crypto";
import { Event } from "rx.mini";
import { RtpPacket } from "werift-rtp";

export class RecognizeSession {
  readonly id = randomUUID();
  readonly onText = new Event<[{ result?: string; partial?: string }]>();

  private readonly encoder = new OpusEncoder(48000, 1);
  private prevPartial = "";

  private constructor(private recognizer: any) {}

  async inputRtp(rtp: RtpPacket) {
    const decoded = this.encoder.decode(rtp.payload);
    this.recognize(decoded);
  }

  static async Create(recognizer: any) {
    const session = new RecognizeSession(recognizer);
    return session;
  }

  private recognize(pcm: Buffer) {
    if (this.recognizer.acceptWaveform(pcm)) {
      const result: string = this.recognizer.result().text;
      if (result) {
        const formatted = result.replaceAll(/\s+/g, "");
        this.onText.execute({ result: formatted });
      }
    } else {
      const partial = this.recognizer.partialResult().partial;
      if (partial) {
        const formatted = partial.replaceAll(/\s+/g, "");
        if (this.prevPartial === formatted) {
          return;
        }
        this.prevPartial = formatted;
        this.onText.execute({ partial: formatted });
      }
    }
  }

  stop() {}
}
