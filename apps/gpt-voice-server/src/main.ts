import { RTCPeerConnection } from "werift";
import { Server } from "ws";
import { SessionFactory } from "../../../libs/rtp2text/src";

import { config } from "./config";
import { VoicevoxClient } from "../../../libs/voicevox-client/src";
import { Audio2Rtp } from "../../../libs/audio2rtp/src";
import { GptSession } from "./domain/gpt";

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

    const textSession = await sessionFactory.create();
    const audio = await Audio2Rtp.Create();
    const gptSession = new GptSession();

    const pc = new RTCPeerConnection();
    const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });

    let read = "";
    gptSession.onResponse.queuingSubscribe(async ({ message, end }) => {
      const wav = await client.speak(message);
      audio
        .inputWav(wav)
        .then(() => {
          read += message;
          dc.send(
            JSON.stringify({
              type: "response",
              payload: read,
            } as ResponseMessage)
          );

          if (end) {
            read = "";
          }
        })
        .catch(() => {});
    });

    audio.onSpeakChanged.subscribe(() => {
      console.log("ai", audio.speaking ? "speaking" : "done");

      if (audio.speaking) {
        dc.send(JSON.stringify({ type: "speaking" }));
      } else {
        dc.send(JSON.stringify({ type: "waiting" }));
      }
    });

    textSession.onText.subscribe(async (res) => {
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

          dc.send(
            JSON.stringify({
              type: "recognized",
              payload: recognized,
            } as RecognizedMessage)
          );

          await gptSession.request(recognized);
        }

        if (res.partial) {
          if (audio.speaking) {
            return;
          }

          const recognized = res.partial;
          if (recognized.length === 1) {
            return;
          }
          if (ngWords.includes(recognized)) {
            return;
          }

          console.log("recognizing", recognized);

          dc.send(
            JSON.stringify({
              type: "recognized",
              payload: recognized,
            } as RecognizedMessage)
          );
        }
      } catch (error) {
        console.error(error);
      }
    });

    audio.onRtp.subscribe((rtp) => {
      transceiver.sender.sendRtp(rtp);
    });

    transceiver.onTrack.subscribe((track) => {
      track.onReceiveRtp.subscribe((rtp) => {
        textSession.inputRtp(rtp);
      });
    });

    const dc = pc.createDataChannel("messaging");
    dc.message.subscribe((s) => {
      const { type } = JSON.parse(s as string);
      switch (type) {
        case "clearHistory":
          {
            gptSession.clearHisotry();
          }
          break;
      }
    });

    await pc.setLocalDescription(await pc.createOffer());
    const sdp = JSON.stringify(pc.localDescription);
    socket.send(sdp);

    socket.on("message", (data: any) => {
      pc.setRemoteDescription(JSON.parse(data)).catch((e) => e);
    });
  } catch (error) {
    console.error("socket", error);
  }
});

interface MessageBase {
  type: string;
  payload: string;
}

interface RecognizedMessage extends MessageBase {
  type: "recognized";
}

interface ResponseMessage extends MessageBase {
  type: "response";
}

type Message = RecognizedMessage | ResponseMessage;
