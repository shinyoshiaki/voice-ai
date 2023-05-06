import { CallConnection } from "../domain/connection";
import { UserService } from "../infrastructure/userService";

export class UserServiceManager {
  private services = new Map<string, UserService>();

  async create(connection: CallConnection) {
    const service = await UserService.Create(connection);
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
