import vosk from "vosk";

import { Session } from "./session";

export class SessionFactory {
  private readonly model = new vosk.Model(this.args.modelPath);
  private readonly sessions: { [id: string]: Session } = {};

  constructor(private args: { modelPath: string }) {}

  async create() {
    const rec = new vosk.Recognizer({
      model: this.model,
      sampleRate: 48000,
    });
    const session = await Session.Create(rec);
    this.sessions[session.id] = session;
    return session;
  }

  stop() {
    this.model.free();
    Object.values(this.sessions).forEach((s) => s.stop());
  }
}
