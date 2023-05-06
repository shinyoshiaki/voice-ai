import { Recognized, Thinking } from "../../../../libs/gpt-voice-rpc/src";
import { SessionService } from "../infrastructure/sessionService";

export class UserUsecase {
  recognizing =
    ({ connection, chatLog }: SessionService) =>
    (sentence: string) => {
      connection.sendMessage<Recognized>({
        type: "recognized",
        payload: chatLog.input({
          message: sentence,
          role: "user",
          overwrite: true,
        }),
      });
    };

  recognized =
    ({ connection, chatLog, gptSession, recognizeVoice }: SessionService) =>
    (sentence: string) => {
      try {
        connection.sendMessage<Recognized>({
          type: "recognized",
          payload: chatLog.endInput(sentence),
        });

        gptSession.request(sentence).catch((e) => console.error(e));

        recognizeVoice.muted = true;
        connection.sendMessage<Thinking>({
          type: "thinking",
        });
      } catch (error) {}
    };
}
