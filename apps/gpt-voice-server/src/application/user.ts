import { Recognized, Thinking } from "../../../../libs/gpt-voice-rpc/src";
import { SessionService } from "../infrastructure/sessionService";
import {
  RtpPacket,
  rtpHeaderExtensionsParser,
  RTP_EXTENSION_URI,
  AudioLevelIndicationPayload,
} from "werift";

export class UserUsecase {
  setupRecognizeVoice = (service: SessionService) => () => {
    service.recognizeVoice.onRecognized.subscribe((recognized) => {
      this.recognized(service)(recognized);
    });
    service.recognizeVoice.onRecognizing.subscribe((sentence) => {
      this.recognizing(service)(sentence);
    });
  };

  setupConnection = (service: SessionService) => () => {
    service.connection.onRtp.subscribe(async (rtp) => {
      await this.inputRecognizeSession(service)(rtp);
    });
  };

  inputRecognizeSession =
    ({ connection, recognizeVoice }: SessionService) =>
    async (rtp: RtpPacket) => {
      const extensions = rtpHeaderExtensionsParser(
        rtp.header.extensions,
        connection.extIdUriMap
      );
      const audioLevel = extensions[
        RTP_EXTENSION_URI.audioLevelIndication
      ] as AudioLevelIndicationPayload;

      if (audioLevel) {
        if (audioLevel.v && audioLevel.level < 127) {
          await recognizeVoice.inputRtp(rtp);
          return;
        } else {
          return;
        }
      }

      await recognizeVoice.inputRtp(rtp);
    };

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

        recognizeVoice.setMuted(true);
        connection.sendMessage<Thinking>({
          type: "thinking",
        });
      } catch (error) {}
    };
}
