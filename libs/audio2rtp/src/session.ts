import { Socket, createSocket } from "dgram";
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
import { WaveFile } from "wavefile";

export interface Options {
  logging?: boolean;
}

export class Audio2Rtp {
  private udp?: Socket;
  onRtp = new Event<[RtpPacket]>();
  private replace = false;
  private seqOffset: number = 0;
  private timestampOffset: number = 0;
  private sequenceNumber?: number;
  private timestamp?: number;

  private constructor(private options: Options) {}

  private listenUdp(port: number) {
    if (this.udp) {
      this.udp.close();
    }
    this.udp = createSocket("udp4");
    this.udp.bind(port);

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

      header.sequenceNumber = uint16Add(header.sequenceNumber, this.seqOffset);
      header.timestamp = uint32Add(header.timestamp, this.timestampOffset);

      this.sequenceNumber = header.sequenceNumber;
      this.timestamp = header.timestamp;

      this.onRtp.execute(rtp);
    });
  }

  static async Create(options: Options = {}) {
    const audio = new Audio2Rtp(options);
    await audio.init();
    return audio;
  }

  private async init() {
    const port = await randomPort();
    this.listenUdp(port);
  }

  private queue = new PromiseQueue();
  speaking = false;
  onSpeakChanged = new Event<[boolean]>();
  stopped = false;

  private speak(b: boolean) {
    if (this.speaking === b) {
      return;
    }

    this.speaking = b;
    this.onSpeakChanged.execute(b);
  }

  async stop() {
    this.stopped = true;

    const needWait = this.queue.queue.length;
    this.queue.queue = [];
    if (needWait) {
      await this.onSpeakChanged.asPromise();
    }
  }

  async inputWav(buf?: Buffer) {
    this.stopped = false;
    this.speak(true);

    if (buf) {
      await this.queue.push(async () => {
        const filePath = `./tmp${randomUUID()}.wav`;

        if (this.options.logging) {
          console.log("speaking:" + filePath);
          console.time("speaking:" + filePath);
        }

        this.replace = true;
        const port = await randomPort();
        this.listenUdp(port);
        await writeFile(filePath, buf);

        if (this.options.logging) {
          console.time("duration:" + filePath);
        }
        const wav = new WaveFile(buf);
        const fmt = wav.fmt as any;
        const data = wav.data as any;
        const sampleRate = fmt.sampleRate;
        const numSamples = (data.samples.length / fmt.bitsPerSample) * 8;
        const duration = numSamples / sampleRate;
        if (this.options.logging) {
          console.timeEnd("duration:" + filePath);
        }

        const process = exec(
          `gst-launch-1.0 filesrc location=${filePath} ! decodebin ! audioconvert ! audioresample ! audio/x-raw, rate=48000 ! opusenc ! rtpopuspay ! udpsink host=127.0.0.1 port=${port}`
        );
        process.on("error", (code) => {
          console.error({ code });
        });
        await new Promise((r) => setTimeout(r, duration * 1000));
        process.kill();

        await rm(filePath);

        if (this.options.logging) {
          console.timeEnd("speaking:" + filePath);
        }
      });
    } else {
      await this.queue.push(async () => {});
    }

    if (this.queue.queue.length === 0) {
      this.speak(false);
    }
  }
}
