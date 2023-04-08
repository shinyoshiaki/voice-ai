import vosk from "vosk";

import { Session } from "./session";

export class SessionFactory {
  private readonly model = new vosk.Model(this.args.modelPath);
  private readonly sessions: { [id: string]: Session } = {};

  constructor(private args: { modelPath: string }) {}

  async create() {
    const session = await Session.Create(this.model);
    this.sessions[session.id] = session;
    return session;
  }

  stop() {
    this.model.free();
    Object.values(this.sessions).forEach((s) => s.stop());
  }
}
