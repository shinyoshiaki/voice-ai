import { Socket, createSocket } from "dgram";
import { rm, writeFile } from "fs/promises";
import {
  PromiseQueue,
  RtpHeader,
  RtpPacket,
  randomPort,
  uint16Add,
  uint32Add,
} from "werift-rtp";
import { Event } from "rx.mini";
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { WaveFile } from "wavefile";

export class Audio2Rtp {
  private udp?: Socket;
  onRtp = new Event<[RtpPacket]>();
  private sequenceNumber: number = 0;
  private timestamp: number = 0;

  private constructor() {}

  private listenUdp(port: number) {}

  static async Create() {
    const audio = new Audio2Rtp();
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
        const wav = new WaveFile(buf);
        const fmt = wav.fmt as any;
        const data = wav.data as any;
        const sampleRate = fmt.sampleRate;
        const numSamples = (data.samples.length / fmt.bitsPerSample) * 8;
        const duration = numSamples / sampleRate;
        wav.toALaw();
        const alaw = wav.toBuffer();

        const rtp = new RtpPacket(
          new RtpHeader({
            ssrc: 0,
            timestamp: this.timestamp,
            sequenceNumber: this.sequenceNumber,
          }),
          Buffer.from(alaw)
        );
        this.onRtp.execute(rtp);
        this.timestamp = uint32Add(this.timestamp, numSamples);
        this.sequenceNumber = uint16Add(this.sequenceNumber, 1);
        await new Promise((r) => setTimeout(r, duration * 1000));
      });
    } else {
      await this.queue.push(async () => {});
    }

    if (this.queue.queue.length === 0) {
      this.speak(false);
    }
  }
}
