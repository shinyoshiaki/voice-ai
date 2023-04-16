import { createSocket } from "dgram";
import ffmpeg from "fluent-ffmpeg";
import { rm, writeFile } from "fs/promises";
import {
  PromiseQueue,
  RtpPacket,
  randomPort,
  uint16Add,
  uint32Add,
} from "werift-rtp";
import { Event } from "rx.mini";
import { randomUUID } from "crypto";
import { exec } from "child_process";

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
        if (this.sequenceNumber != undefined) {
          this.seqOffset = uint16Add(this.sequenceNumber, -sequenceNumber);
        }
        if (this.timestamp != undefined) {
          this.timestampOffset = uint32Add(this.timestamp, -timestamp);
        }

        this.replace = false;
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

  private queue = new PromiseQueue();
  speaking = false;
  onSpeakChanged = new Event();

  private speak(b: boolean) {
    if (this.speaking === b) {
      return;
    }

    this.speaking = b;
    this.onSpeakChanged.execute();
  }

  async inputWav(buf: Buffer) {
    this.speak(true);
    await this.queue.push(async () => {
      const filePath = `./tmp${randomUUID()}.wav`;

      this.replace = true;

      await writeFile(filePath, buf);
      const duration = await new Promise<number>((r, f) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            f(err);
          }
          if (metadata) {
            const duration = metadata.format.duration ?? 0;
            r(duration);
          }
        });
      });

      const process = exec(
        `gst-launch-1.0 filesrc location=${filePath} ! decodebin ! audioconvert ! audioresample ! audio/x-raw, rate=48000 ! opusenc ! rtpopuspay ! udpsink host=127.0.0.1 port=${this.port}`
      );
      process.on("error", (code) => {
        console.error({ code });
      });
      await new Promise((r) =>
        setTimeout(
          r,
          duration * 1000 +
            // 要調整
            100
        )
      );

      await rm(filePath);

      process.kill();
    });
    if (this.queue.queue.length === 0) {
      this.speak(false);
    }
  }
}
