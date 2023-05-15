import { assistantUsecase, userUsecase } from "../bootstrap";
import { rpcController } from "../controller/rpc";
import { CallConnection } from "../domain/connection";
import { SessionServiceManager } from "./sessionServiceManager";
import { SessionService } from "../infrastructure/sessionService";
import { models } from "../domain/model/factory";

export class CallUsecase {
  constructor(private sessionServiceManager: SessionServiceManager) {}

  async call() {
    const connection = new CallConnection();
    const sdp = await connection.offer();

    const service = await this.sessionServiceManager.create(
      connection,
      models[0]
    );
    this.setupSession(service);

    return { id: service.id, sdp, models };
  }

  private setupSession(service: SessionService) {
    const destroyRpcController = rpcController(service);

    const { connection, audio2Rtp } = service;

    connection.onClosed.once(async () => {
      destroyRpcController();
      this.sessionServiceManager.delete(service.id);
      await service.destroy();
    });
    audio2Rtp.onRtp.subscribe((rtp) => {
      connection.sendRtp(rtp);
    });

    userUsecase.setupConnection(service)();
    userUsecase.setupRecognizeVoice(service)();

    assistantUsecase.setupGptSession(service)();
    assistantUsecase.setupAudio2Rtp(service)();
  }

  async answer({ sessionId, answer }: { sessionId: string; answer: object }) {
    const service = this.sessionServiceManager.get(sessionId);
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
    const service = this.sessionServiceManager.get(sessionId);
    if (!service) {
      throw new Error("session not found");
    }
    const connection = service.connection;
    await connection.addIceCandidate(ice as any);
  }
}
