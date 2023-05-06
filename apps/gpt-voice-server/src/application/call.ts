import { rpcController } from "../controller/rpc";
import { CallConnection } from "../domain/connection";
import { UserServiceManager } from "./userServiceManager";

export class CallUsecase {
  constructor(private userServiceManager: UserServiceManager) {}

  async call() {
    const connection = new CallConnection();
    const sdp = await connection.offer();

    const service = await this.userServiceManager.create(connection);
    const destroy = rpcController(service);

    connection.onClosed.once(() => {
      destroy();
      service.destroy();
      this.userServiceManager.delete(service.id);
    });

    return { id: service.id, sdp, models: ["gpt3"] };
  }

  async answer({ sessionId, answer }: { sessionId: string; answer: object }) {
    const service = this.userServiceManager.get(sessionId);
    if (!service) {
      throw new Error("session not found");
    }
    const connection = service.connection;
    await connection.answer(answer as any);
  }

  async addIceCandidate({
    sessionId,
    ice,
  }: {
    sessionId: string;
    ice: object;
  }) {
    const service = this.userServiceManager.get(sessionId);
    if (!service) {
      throw new Error("session not found");
    }
    const connection = service.connection;
    await connection.addIceCandidate(ice as any);
  }
}
