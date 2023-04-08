import { OpusEncoder } from "@discordjs/opus";
import { randomUUID } from "crypto";
import { Event } from "rx.mini";
import vosk from "vosk";
import { RtpPacket } from "werift";

export class Session {
  readonly id = randomUUID();
  private readonly rec = new vosk.Recognizer({
    model: this.model,
    sampleRate: 48000,
  });
  private readonly encoder = new OpusEncoder(48000, 1);
  onText = new Event<[{ result?: string; partial?: string }]>();

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
        this.onText.execute({ result: result.replaceAll(/\s+/g, "") });
      }
    } else {
      const partial = this.rec.partialResult().partial;
      if (partial) {
        this.onText.execute({ partial });
      }
    }
  }

  stop() {
    this.rec.free();
    this.model.free();
  }
}
