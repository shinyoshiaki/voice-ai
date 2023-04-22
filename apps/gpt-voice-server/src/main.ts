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

    const speech2textSession = await sessionFactory.create();
    const audio = await Audio2Rtp.Create();
    const gptSession = new GptSession();

    const pc = new RTCPeerConnection();
    const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });

    let chatIndex = 0;
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
              payload: { content: read, index: chatIndex },
            })
          );

          if (end) {
            read = "";
            chatIndex++;
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

          dc.send(
            JSON.stringify({
              type: "recognized",
              payload: { content: recognized, index: chatIndex },
            })
          );
          chatIndex++;

          gptSession.request(recognized).catch((e) => console.error(e));
          dc.send(
            JSON.stringify({
              type: "thinking",
            })
          );
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
          dc.send(
            JSON.stringify({
              type: "recognized",
              payload: { content: recognizing, index: chatIndex },
            })
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
        speech2textSession.inputRtp(rtp);
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
