import { Server } from "ws";

import { config } from "./config";
import { Audio2Rtp } from "../../../libs/audio2rtp/src";
import { GptSession } from "./domain/gpt";
import { CallConnection } from "./domain/connection";
import { ChatLogs } from "./domain/chat";
import { RecognizeVoice } from "./domain/recognize";
import { TtsClient } from "./domain/tts";
import { UserUsecase } from "./usecase/user";
import { AssistantUsecase } from "./usecase/assistant";

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

    const audio = await Audio2Rtp.Create();
    const recognizeVoice = await RecognizeVoice.Create();
    const chatLog = new ChatLogs();
    const connection = new CallConnection();
    const tts = new TtsClient(audio);
    const gptSession = new GptSession();

    const userUsecase = new UserUsecase(
      connection,
      chatLog,
      gptSession,
      recognizeVoice
    );
    const assistantUsecase = new AssistantUsecase(
      connection,
      chatLog,
      gptSession,
      recognizeVoice,
      audio,
      tts
    );

    socket.on("close", () => {
      userUsecase.destroy();
      assistantUsecase.destroy();
    });

    socket.on("message", async (data: any) => {
      await connection.answer(JSON.parse(data));
    });
    socket.send(await connection.offer());
  } catch (error) {
    console.error("socket", error);
  }
});
