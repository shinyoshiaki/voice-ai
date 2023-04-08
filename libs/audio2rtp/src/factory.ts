import { createSocket } from "dgram";
import ffmpeg from "fluent-ffmpeg";
import { writeFile } from "fs/promises";
import { RtpPacket, randomPort, uint16Add, uint32Add } from "werift-rtp";
import { Event } from "rx.mini";

export class Audio2Rtp {
  udp = createSocket("udp4");
  port!: number;
  onRtp = new Event<[RtpPacket]>();
  private replace = false;
  private seqOffset: number = 0;
  private timestampOffset: number = 0;
  private sequenceNumber?: number;
  private timestamp?: number;

  private constructor() {
    this.udp.on("message", (data) => {
      const rtp = RtpPacket.deSerialize(data);
      const header = rtp.header;
      const { sequenceNumber, timestamp } = header;

      if (this.replace) {
        this.replace = false;

        if (this.sequenceNumber != undefined) {
          this.seqOffset = uint16Add(this.sequenceNumber, -sequenceNumber);
        }
        if (this.timestamp != undefined) {
          this.timestampOffset = uint32Add(this.timestamp, -timestamp);
        }
      }

      header.timestamp = uint32Add(header.timestamp, this.timestampOffset);
      header.sequenceNumber = uint16Add(header.sequenceNumber, this.seqOffset);
      this.timestamp = header.timestamp;
      this.sequenceNumber = header.sequenceNumber;
      this.onRtp.execute(rtp);
    });
  }

  static async Create() {
    const audio = new Audio2Rtp();
    await audio.init();
    return audio;
  }

  private async init() {
    this.port = await randomPort();
    this.udp.bind(this.port);
  }

  async inputWav(buf: Buffer) {
    await writeFile("./tmp.wav", buf);
    this.replace = true;
    await new Promise<void>((r, f) => {
      ffmpeg("./tmp.wav")
        .audioCodec("libopus")
        .audioFrequency(48000)
        .format("rtp")
        .output(`rtp://127.0.0.1:${this.port}`)
        .on("error", (err) => {
          f(err);
        })
        .on("end", () => {
          r();
        })
        .run();
    });
  }
}
