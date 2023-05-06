import { rpcController } from "../controller/rpc";
import { CallConnection } from "../domain/connection";
import { UserSessionRepository } from "../domain/session/sessionRepository";

export class CallUsecase {
  constructor(private userSessionRepository: UserSessionRepository) {}

  async call() {
    const connection = new CallConnection();
    const sdp = await connection.offer();

    const session = await this.userSessionRepository.create(connection);
    const destroy = rpcController(connection, session.assistantUsecase);

    connection.onClosed.once(() => {
      destroy();
      session.destroy();
      this.userSessionRepository.delete(session.id);
    });

    return { id: session.id, sdp, models: ["gpt3"] };
  }

  async answer({ sessionId, answer }: { sessionId: string; answer: object }) {
    const session = this.userSessionRepository.get(sessionId);
    if (!session) {
      throw new Error("session not found");
    }
    const connection = session.connection;
    await connection.answer(answer as any);
  }

  async addIceCandidate({
    sessionId,
    ice,
  }: {
    sessionId: string;
    ice: object;
  }) {
    const session = this.userSessionRepository.get(sessionId);
    if (!session) {
      throw new Error("session not found");
    }
    const connection = session.connection;
    await connection.addIceCandidate(ice as any);
  }
}
