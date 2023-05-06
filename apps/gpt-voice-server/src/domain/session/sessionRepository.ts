import { CallConnection } from "../connection";
import { UserSession } from "./session";

export class UserSessionRepository {
  private sessions = new Map<string, UserSession>();

  async create(connection: CallConnection) {
    const session = await UserSession.Create(connection);
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string) {
    return this.sessions.get(id);
  }

  delete(id: string) {
    this.sessions.delete(id);
  }
}
