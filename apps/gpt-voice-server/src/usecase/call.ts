import { UserSessionRepository } from "../domain/session/sessionRepository";

export class CallUsecase {
  constructor(private callSessionRepository: UserSessionRepository) {}

  async call() {
    const session = await this.callSessionRepository.create();
    const connection = session.connection;
    const sdp = await connection.offer();
    return { id: session.id, sdp, models: ["gpt3"] };
  }

  async answer({ sessionId, answer }: { sessionId: string; answer: object }) {
    const session = this.callSessionRepository.get(sessionId);
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
    const session = this.callSessionRepository.get(sessionId);
    if (!session) {
      throw new Error("session not found");
    }
    const connection = session.connection;
    await connection.addIceCandidate(ice as any);
  }
}
