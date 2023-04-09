import { OpusEncoder } from "@discordjs/opus";
import { randomUUID } from "crypto";
import { Event } from "rx.mini";
import { RtpPacket } from "werift";

export class Session {
  readonly id = randomUUID();
  readonly onText = new Event<[{ result?: string; partial?: string }]>();

  private readonly encoder = new OpusEncoder(48000, 1);
  private prevPartial = "";

  private constructor(private rec: any) {}

  async inputRtp(rtp: RtpPacket) {
    const decoded = this.encoder.decode(rtp.payload);
    this.recognize(decoded);
  }

  static async Create(rec: any) {
    const session = new Session(rec);
    return session;
  }

  recognize(pcm: Buffer) {
    if (this.rec.acceptWaveform(pcm)) {
      const result: string = this.rec.result().text;
      if (result) {
        const formatted = result.replaceAll(/\s+/g, "");
        this.onText.execute({ result: formatted });
      }
    } else {
      const partial = this.rec.partialResult().partial;
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
