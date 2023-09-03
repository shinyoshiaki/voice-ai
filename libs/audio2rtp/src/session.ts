import {
  PromiseQueue,
  RtpHeader,
  RtpPacket,
  uint16Add,
  uint32Add,
} from "werift-rtp";
import { Event } from "rx.mini";
import { WaveFile } from "wavefile";

export class Audio2Rtp {
  onRtp = new Event<[RtpPacket]>();
  private sequenceNumber: number = 0;
  private timestamp: number = 0;

  private constructor() {}

  static async Create() {
    const audio = new Audio2Rtp();
    return audio;
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
      // ダウンサンプリングすると音量が小さく聞こえるので増幅する
      buf = amplifyWavBuffer(buf, 10);
      await this.queue.push(async () => {
        const wav = new WaveFile(buf);
        wav.toSampleRate(8000);
        wav.toMuLaw();
        const uLaw = wav.toBuffer();

        const samplesPerPacket = 8 * 20;

        for (let i = 0; i < uLaw.length; i += samplesPerPacket) {
          const chunk = Buffer.from(uLaw.slice(i, i + samplesPerPacket));
          const rtp = new RtpPacket(
            new RtpHeader({
              ssrc: 0,
              payloadType: 8,
              timestamp: this.timestamp,
              sequenceNumber: this.sequenceNumber,
            }),
            chunk
          );
          this.onRtp.execute(rtp);
          this.timestamp = uint32Add(this.timestamp, samplesPerPacket);
          this.sequenceNumber = uint16Add(this.sequenceNumber, 1);
          await new Promise((r) => setTimeout(r, 20));
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

function amplifyWavBuffer(inputBuffer: Buffer, amplifyFactor: number): Buffer {
  // WAVヘッダーの確認とデータの位置の取得
  if (
    inputBuffer.subarray(0, 4).toString() !== "RIFF" ||
    inputBuffer.subarray(8, 12).toString() !== "WAVE"
  ) {
    throw new Error("Invalid WAV file.");
  }

  let dataChunkPosition = -1;
  for (let i = 12; i < inputBuffer.length - 4; i++) {
    if (inputBuffer.subarray(i, i + 4).toString() === "data") {
      dataChunkPosition = i + 4;
      break;
    }
  }

  if (dataChunkPosition === -1) {
    throw new Error("DATA chunk not found in WAV file.");
  }

  const dataChunkSize = inputBuffer.readUInt32LE(dataChunkPosition);
  const amplifiedBuffer = Buffer.alloc(inputBuffer.length);

  inputBuffer.copy(amplifiedBuffer);

  for (
    let i = dataChunkPosition + 4;
    i < dataChunkPosition + 4 + dataChunkSize;
    i += 2
  ) {
    const sample = inputBuffer.readInt16LE(i);
    let amplifiedSample = sample * amplifyFactor;

    // クリッピングを避ける
    if (amplifiedSample > 32767) {
      amplifiedSample = 32767;
    } else if (amplifiedSample < -32768) {
      amplifiedSample = -32768;
    }

    amplifiedBuffer.writeInt16LE(amplifiedSample, i);
  }

  return amplifiedBuffer;
}
