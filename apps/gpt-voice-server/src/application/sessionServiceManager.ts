import { CallConnection } from "../domain/connection";
import { SessionService } from "../infrastructure/sessionService";

export class SessionServiceManager {
  private services = new Map<string, SessionService>();

  async create(connection: CallConnection) {
    const service = await SessionService.Create(connection);
    this.services.set(service.id, service);
    return service;
  }

  get(id: string) {
    return this.services.get(id);
  }

  delete(id: string) {
    this.services.delete(id);
  }
}
