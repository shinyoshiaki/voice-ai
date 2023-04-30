import { Server } from "ws";

import { config } from "./config";
import { Audio2Rtp } from "../../../libs/audio2rtp/src";
import { GptSession } from "./domain/gpt";
import { CallConnection } from "./domain/connection";
import { ChatLog } from "./domain/chat";
import { RecognizeVoice } from "./domain/recognize";
import { TtsClient } from "./domain/tts";

const server = new Server({ port: config.port });

console.log({ config });

server.on("close", () => {
  console.log("server closed");
});

server.on("error", (e) => {
  console.error("server error", e);
});

server.on("connection", async (socket) => {
  try {
    console.log("new session");

    const chatLog = new ChatLog();

    const connection = new CallConnection();
    connection.onMessage.subscribe(async (s) => {
      const { type } = JSON.parse(s as string);
      switch (type) {
        case "clearHistory":
          {
            gptSession.clearHistory();
          }
          break;
        case "stop":
          {
            gptSession.stop();
            await audio.stop();
            chatLog.end(chatLog.content);
          }
          break;
      }
    });
    connection.onRtp.subscribe(async (rtp) => {
      await recognizeVoice.inputRtp(rtp);
    });

    const audio = await Audio2Rtp.Create();
    audio.onSpeakChanged.subscribe(() => {
      console.log("ai", audio.speaking ? "speaking" : "done");

      if (audio.speaking) {
        recognizeVoice.muted = true;
        connection.send({ type: "speaking" });
      } else {
        recognizeVoice.muted = false;
        connection.send({ type: "waiting" });
      }
    });
    audio.onRtp.subscribe((rtp) => {
      connection.sendRtp(rtp);
    });

    const tts = new TtsClient(audio);

    const gptSession = new GptSession();
    gptSession.onResponse.queuingSubscribe(async ({ message, end }) => {
      tts
        .speak(message)
        .then(() => {
          if (!gptSession.stopped) {
            connection.send({
              type: "response",
              payload: chatLog.put(message),
            });

            if (end) {
              chatLog.end(chatLog.content);
            }
          }
        })
        .catch(() => {});
    });

    const recognizeVoice = await RecognizeVoice.Create();
    recognizeVoice.onRecognized.subscribe((recognized) => {
      connection.send({
        type: "recognized",
        payload: chatLog.end(recognized),
      });

      gptSession.request(recognized).catch((e) => console.error(e));

      recognizeVoice.muted = true;
      connection.send({
        type: "thinking",
      });
    });
    recognizeVoice.onRecognizing.subscribe((recognizing) => {
      connection.send({
        type: "recognized",
        payload: chatLog.post(recognizing),
      });
    });

    socket.on("message", async (data: any) => {
      await connection.answer(JSON.parse(data));
    });
    socket.send(await connection.offer());
  } catch (error) {
    console.error("socket", error);
  }
});
