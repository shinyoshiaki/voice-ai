import {
  Response,
  Speaking,
  Waiting,
} from "../../../../libs/gpt-voice-rpc/src";
import { SessionService } from "../infrastructure/sessionService";

export class AssistantUsecase {
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
      await audio2Rtp.stop();
      chatLog.cancel();

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
}
