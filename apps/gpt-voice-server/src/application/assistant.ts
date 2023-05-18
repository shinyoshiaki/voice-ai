import {
  Response,
  Speaking,
  Waiting,
} from "../../../../libs/gpt-voice-rpc/src";
import { assistantModelFactory } from "../domain/model/factory";
import { SessionService } from "../infrastructure/sessionService";

export class AssistantUsecase {
  setupGptSession = (service: SessionService) => () => {
    service.gptSession.onResponse.subscribe(({ message, end }) => {
      this.text2speak(service)(message, end);
    });
  };

  setupAudio2Rtp = (service: SessionService) => () => {
    service.audio2Rtp.onSpeakChanged.subscribe((speaking) => {
      this.changeSpeaking(service)(speaking);
    });
  };

  clearHistory =
    ({ gptSession, chatLog }: SessionService) =>
    () => {
      gptSession.clearHistory();
      chatLog.clear();
    };

  cancelQuestion =
    ({
      recognizeVoice,
      connection,
      gptSession,
      audio2Rtp,
      chatLog,
    }: SessionService) =>
    async () => {
      gptSession.stop();
      chatLog.cancel();

      await audio2Rtp.stop();
      recognizeVoice.muted = false;
      connection.sendMessage<Waiting>({ type: "waiting" });
    };

  text2speak =
    ({ tts, gptSession, connection, chatLog }: SessionService) =>
    (message: string, end?: boolean) => {
      tts
        .speak(message)
        .then(() => {
          if (!gptSession.stopped) {
            connection.sendMessage<Response>({
              type: "response",
              payload: chatLog.input({ message, role: "assistant" }),
            });

            if (end) {
              chatLog.endInput();
              connection.sendMessage<Waiting>({ type: "waiting" });
            }
          }
        })
        .catch(() => {});
    };

  changeSpeaking =
    ({ recognizeVoice, connection }: SessionService) =>
    (speaking: boolean) => {
      if (speaking) {
        recognizeVoice.muted = true;
        connection.sendMessage<Speaking>({ type: "speaking" });
      } else {
        recognizeVoice.muted = false;
        connection.sendMessage<Waiting>({ type: "waiting" });
      }
    };

  changeModel = (service: SessionService) => (model: string) => {
    if (service.gptSession.modelName === model) return;

    service.gptSession.stop();
    const newSession = assistantModelFactory(model);
    newSession.importHistory(service.gptSession.conversationHistory);
    service.gptSession = newSession;

    this.setupGptSession(service)();
  };
}
