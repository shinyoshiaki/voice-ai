import { Server } from "ws";
import { SessionFactory } from "../../../libs/rtp2text/src";

import { config } from "./config";
import { VoicevoxClient } from "../../../libs/voicevox-client/src";
import { Audio2Rtp } from "../../../libs/audio2rtp/src";
import { GptSession } from "./domain/gpt";
import { CallConnection } from "./domain/connection";
import { ChatLog } from "./domain/chat";

const server = new Server({ port: config.port });

const client = new VoicevoxClient();

console.log("start");

console.log({ config });
const ngWords = ["えーっと", "えー", "えーと"];

const sessionFactory = new SessionFactory({
  modelPath: config.modelPath,
});

server.on("close", () => {
  console.log("server closed");
});

server.on("error", (e) => {
  console.error("server error", e);
});

server.on("connection", async (socket) => {
  try {
    console.log("new session");

    const speech2textSession = await sessionFactory.create();
    const audio = await Audio2Rtp.Create();
    const gptSession = new GptSession();
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

    audio.onSpeakChanged.subscribe(() => {
      console.log("ai", audio.speaking ? "speaking" : "done");

      if (audio.speaking) {
        connection.send({ type: "speaking" });
      } else {
        connection.send({ type: "waiting" });
      }
    });

    speech2textSession.onText.subscribe(async (res) => {
      try {
        if (audio.speaking) {
          return;
        }

        if (res.result) {
          let recognized = res.result;

          if (recognized.length === 1) {
            return;
          }
          if (ngWords.includes(recognized)) {
            return;
          }
          if (recognized[0] === "ん") {
            recognized = recognized.slice(1);
          }

          for (const ng of ngWords) {
            if (recognized.startsWith(ng)) {
              recognized = recognized.slice(ng.length);
              break;
            }
          }

          console.log("me", recognized);

          connection.send({
            type: "recognized",
            payload: chat.end(recognized),
          });

          gptSession.request(recognized).catch((e) => console.error(e));
          connection.send({
            type: "thinking",
          });
        }

        if (res.partial) {
          if (audio.speaking) {
            return;
          }

          const recognizing = res.partial;
          if (recognizing.length === 1) {
            return;
          }
          if (ngWords.includes(recognizing)) {
            return;
          }

          console.log("recognizing", recognizing);
          connection.send({
            type: "recognized",
            payload: chat.post(recognizing),
          });
        }
      } catch (error) {
        console.error(error);
      }
    });

    audio.onRtp.subscribe((rtp) => {
      connection.sendRtp(rtp);
    });

    connection.onRtp.subscribe((rtp) => {
      speech2textSession.inputRtp(rtp);
    });

    socket.on("message", async (data: any) => {
      await connection.answer(JSON.parse(data));
    });
    socket.send(await connection.offer());
  } catch (error) {
    console.error("socket", error);
  }
});
