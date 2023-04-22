import { Server } from "ws";

import { config } from "./config";
import { VoicevoxClient } from "../../../libs/voicevox-client/src";
import { Audio2Rtp } from "../../../libs/audio2rtp/src";
import { GptSession } from "./domain/gpt";
import { CallConnection } from "./domain/connection";
import { ChatLog } from "./domain/chat";
import { Recognize } from "./domain/recognize";

const server = new Server({ port: config.port });

const client = new VoicevoxClient();

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

    const chat = new ChatLog();

    const connection = new CallConnection();
    connection.onMessage.subscribe((s) => {
      const { type } = JSON.parse(s as string);
      switch (type) {
        case "clearHistory":
          {
            gptSession.clearHistory();
          }
          break;
      }
    });
    connection.onRtp.subscribe(async (rtp) => {
      await recognize.inputRtp(rtp);
    });

    const audio = await Audio2Rtp.Create();
    audio.onSpeakChanged.subscribe(() => {
      console.log("ai", audio.speaking ? "speaking" : "done");

      if (audio.speaking) {
        recognize.muted = true;
        connection.send({ type: "speaking" });
      } else {
        recognize.muted = false;
        connection.send({ type: "waiting" });
      }
    });
    audio.onRtp.subscribe((rtp) => {
      connection.sendRtp(rtp);
    });

    const gptSession = new GptSession();
    gptSession.onResponse.queuingSubscribe(async ({ message, end }) => {
      const wav = await client.speak(message);
      audio
        .inputWav(wav)
        .then(() => {
          connection.send({
            type: "response",
            payload: chat.put(message),
          });

          if (end) {
            chat.end(chat.content);
          }
        })
        .catch(() => {});
    });

    const recognize = await Recognize.Create();
    recognize.onRecognized.subscribe((recognized) => {
      connection.send({
        type: "recognized",
        payload: chat.end(recognized),
      });

      gptSession.request(recognized).catch((e) => console.error(e));
      connection.send({
        type: "thinking",
      });
    });
    recognize.onRecognizing.subscribe((recognizing) => {
      connection.send({
        type: "recognized",
        payload: chat.post(recognizing),
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
