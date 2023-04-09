import { RTCPeerConnection } from "werift";
import { Server } from "ws";
import { SessionFactory } from "../../../libs/rtp2text/src";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { config } from "./config";
import { VoicevoxClient } from "../../../libs/voicevox-client/src";
import { Audio2Rtp } from "../../../libs/audio2rtp/src";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const server = new Server({ port: 8888 });
const conf = new Configuration({
  apiKey: config.openai,
});
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

    const session = await sessionFactory.create();
    const openai = new OpenAIApi(conf);
    const audio = await Audio2Rtp.Create();

    socket.on("close", () => {
      try {
        console.log("session closed");
        pc.close();
        session.stop();
      } catch (error) {
        console.error("session close failed", error);
      }
    });

    const pc = new RTCPeerConnection();
    const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });

    audio.onSpeakChanged.subscribe(() => {
      console.log("ai", audio.speaking ? "speaking" : "done");

      if (audio.speaking) {
        dc.send(JSON.stringify({ type: "speaking" }));
      } else {
        dc.send(JSON.stringify({ type: "waiting" }));
      }
    });

    let conversationHistory: ChatCompletionRequestMessage[] = [];

    session.onText.subscribe(async (res) => {
      const systemConversation: ChatCompletionRequestMessage[] = [
        {
          role: "user",
          content: `現在時刻は ${format(Date.now(), "HH時mm分", {
            locale: ja,
          })} です。時刻を聞かれたらそう答えてください`,
        },
      ];
      console.log(systemConversation);

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

          dc.send(JSON.stringify({ type: "thinking" }));

          conversationHistory.push({ role: "user", content: recognized });

          const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [...systemConversation, ...conversationHistory],
          });
          const [choice] = completion.data.choices;
          if (!choice.message) {
            return;
          }
          conversationHistory.push(choice.message);
          const response = choice.message.content;

          console.log("ai", response);

          let read = "";
          dc.send(
            JSON.stringify({
              type: "response",
              payload: read,
            } as ResponseMessage)
          );

          dc.send(JSON.stringify({ type: "talking" }));
          for (const word of response.split("、").filter((v) => v)) {
            const wav = await client.speak(word);
            audio
              .inputWav(wav, { metadata: word })
              .then(() => {
                read += word;
                dc.send(
                  JSON.stringify({
                    type: "response",
                    payload: read,
                  } as ResponseMessage)
                );
              })
              .catch((e) => e);
          }
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
        session.inputRtp(rtp);
      });
    });

    const dc = pc.createDataChannel("messaging");
    dc.message.subscribe((s) => {
      const { type } = JSON.parse(s as string);
      switch (type) {
        case "clearHistory":
          {
            conversationHistory = [];
          }
          break;
      }
    });

    await pc.setLocalDescription(await pc.createOffer());
    const sdp = JSON.stringify(pc.localDescription);
    socket.send(sdp);

    socket.on("message", (data: any) => {
      pc.setRemoteDescription(JSON.parse(data));
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
