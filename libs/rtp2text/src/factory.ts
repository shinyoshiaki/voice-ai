import vosk from "vosk";

import { RecognizeSession } from "./session";

export class SessionFactory {
  private readonly model = new vosk.Model(this.args.modelPath);
  private readonly sessions: { [id: string]: RecognizeSession } = {};

  constructor(private args: { modelPath: string }) {}

  async create() {
    const recognizer = new vosk.Recognizer({
      model: this.model,
      sampleRate: 48000,
    });
    const session = await RecognizeSession.Create(recognizer);
    this.sessions[session.id] = session;
    return session;
  }

  stop() {
    this.model.free();
    Object.values(this.sessions).forEach((s) => s.stop());
  }
}
