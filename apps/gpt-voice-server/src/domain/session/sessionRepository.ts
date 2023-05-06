import { UserSession } from "./session";

export class UserSessionRepository {
  private sessions = new Map<string, UserSession>();

  async create() {
    const session = await UserSession.Create();
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string) {
    return this.sessions.get(id);
  }
}
