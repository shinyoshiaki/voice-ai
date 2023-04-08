import { OpusEncoder } from "@discordjs/opus";
import { randomUUID } from "crypto";
import { Event } from "rx.mini";
import vosk from "vosk";
import { RtpPacket } from "werift";

export class Session {
  readonly id = randomUUID();
  readonly onText = new Event<[{ result?: string; partial?: string }]>();

  private readonly rec = new vosk.Recognizer({
    model: this.model,
    sampleRate: 48000,
  });
  private readonly encoder = new OpusEncoder(48000, 1);
  private prevPartial = "";

  private constructor(private model: any) {}

  async inputRtp(rtp: RtpPacket) {
    const decoded = this.encoder.decode(rtp.payload);
    this.recognize(decoded);
  }

  static async Create(model: any) {
    const session = new Session(model);
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

  stop() {
    this.rec.free();
    this.model.free();
  }
}
