import { EventDisposer } from "rx.mini";
import { assistantUsecase, userUsecase } from "../bootstrap";
import { rpcController } from "../controller/rpc";
import { CallConnection } from "../domain/connection";
import { SessionServiceManager } from "./sessionServiceManager";
import { SessionService } from "../infrastructure/sessionService";

export class CallUsecase {
  constructor(private sessionServiceManager: SessionServiceManager) {}

  async call() {
    const connection = new CallConnection();
    const sdp = await connection.offer();

    const service = await this.sessionServiceManager.create(connection);
    this.setupSession(service);

    return { id: service.id, sdp, models: ["gpt3"] };
  }

  private setupSession(service: SessionService) {
    const destroyRpcController = rpcController(service);
    const disposer = new EventDisposer();

    const { connection, audio2Rtp, gptSession, recognizeVoice } = service;

    {
      connection.onClosed.once(() => {
        destroyRpcController();
        disposer.dispose();

        this.sessionServiceManager.delete(service.id);
        service.destroy();
      });
      connection.onRtp
        .subscribe(async (rtp) => {
          await recognizeVoice.inputRtp(rtp);
        })
        .disposer(disposer);
    }

    {
      gptSession.onResponse
        .subscribe(({ message, end }) => {
          assistantUsecase.text2speak(service)(message, end);
        })
        .disposer(disposer);
    }

    {
      audio2Rtp.onRtp
        .subscribe((rtp) => {
          connection.sendRtp(rtp);
        })
        .disposer(disposer);
      audio2Rtp.onSpeakChanged
        .subscribe((speaking) => {
          assistantUsecase.changeSpeaking(service)(speaking);
        })
        .disposer(disposer);
    }

    {
      recognizeVoice.onRecognized
        .subscribe((recognized) => {
          userUsecase.recognized(service)(recognized);
        })
        .disposer(disposer);

      recognizeVoice.onRecognizing
        .subscribe((sentence) => {
          userUsecase.recognizing(service)(sentence);
        })
        .disposer(disposer);
    }
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
