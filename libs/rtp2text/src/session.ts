import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import { mkdir, readFile, rm } from "fs/promises";
import { Event } from "rx.mini";
import vosk from "vosk";
import {
  DepacketizeCallback,
  RtpPacket,
  RtpSourceCallback,
  RtpTimeCallback,
  saveToFileSystem,
  uint16Add,
  WebmCallback,
} from "werift";

export class Session {
  readonly id = randomUUID();
  private readonly rec = new vosk.Recognizer({
    model: this.model,
    sampleRate: 16000,
  });
  onText = new Event<[{ result?: string; partial?: string }]>();
  private readonly source = new RtpSourceCallback();

  private constructor(private model: any) {
    this.start(__dirname + "/tmp");
  }

  private async start(tmpPath: string) {
    await rm(tmpPath, { recursive: true, force: true });
    await mkdir(tmpPath, { recursive: true });

    let webm: WebmCallback;
    const createWebm = () => {
      return new WebmCallback(
        [
          {
            kind: "audio",
            codec: "OPUS",
            clockRate: 48000,
            trackNumber: 1,
          },
        ],
        { duration: 1000 * 60 * 60 * 24 }
      );
    };
    webm = createWebm();

    const time = new RtpTimeCallback(48000);
    const depacketizer = new DepacketizeCallback("opus");

    this.source.pipe((input) => {
      time.input(input);
    });
    time.pipe((input) => {
      depacketizer.input(input);
    });
    depacketizer.pipe((input) => {
      webm.inputAudio(input);
    });

    let index = 0;
    const filename = () => tmpPath + "/" + index + ".webm";
    webm.pipe(saveToFileSystem(filename()));

    for (;;) {
      await new Promise((r) => setTimeout(r, 100));

      const prevPath = filename();

      webm.inputAudio({ eol: true });
      const old = webm;
      webm = createWebm();
      depacketizer.pipe(webm.inputAudio);
      index = uint16Add(index, 1);
      webm.pipe(saveToFileSystem(filename()));

      if (old.elapsed == undefined) {
        continue;
      }
      const pcm = await this.webmToPcm(prevPath, tmpPath + "/o.pcm");
      this.recognize(pcm);
      await rm(prevPath, { force: true });
    }
  }

  async inputRtp(rtp: RtpPacket) {
    try {
      this.source.input(rtp);
    } catch (error) {
      console.log(error);
    }
  }

  private async webmToPcm(input: string, output: string) {
    await new Promise<void>((r, f) => {
      ffmpeg()
        .input(input)
        .outputOptions([
          "-f",
          "s16le", // 16-bit signed little-endian PCMデータを指定
          "-ar",
          "16000", // 出力のサンプルレートを16000Hzに設定
          "-ac",
          "1", // モノラルを指定、ステレオの場合は2に変更
        ])
        .output(output)
        .on("end", () => {
          r();
        })
        .on("error", (error) => {
          f(error);
        })
        .run();
    });
    const resampled = await readFile(output);
    return resampled;
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
