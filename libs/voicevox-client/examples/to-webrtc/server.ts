import { RTCPeerConnection } from "werift";
import { Server } from "ws";
import { VoicevoxClient } from "../../src";
import { Audio2Rtp } from "../../../audio2rtp/src";

const server = new Server({ port: 8888 });
const client = new VoicevoxClient();
console.log("start");

server.on("connection", async (socket) => {
  const pc = new RTCPeerConnection();
  const audio = await Audio2Rtp.Create();

  const transceiver = pc.addTransceiver("audio", { direction: "sendonly" });
  audio.onRtp.subscribe((rtp) => {
    transceiver.sender.sendRtp(rtp);
  });

  await pc.setLocalDescription(await pc.createOffer());
  const sdp = JSON.stringify(pc.localDescription);
  socket.send(sdp);

  socket.on("message", (data: any) => {
    pc.setRemoteDescription(JSON.parse(data));
  });

  for (let i = 0; i < 10; i++) {
    const res = await client.speak("おはよう");
    await audio.inputWav(res);

    await new Promise((r) => setTimeout(r, 5000));
  }
});
