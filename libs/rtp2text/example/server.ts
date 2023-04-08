import { RTCPeerConnection } from "werift";
import { Server } from "ws";

import { SessionFactory } from "../src";

const server = new Server({ port: 8888 });
console.log("start");

const factory = new SessionFactory({ modelPath: __dirname + "/vosk_model" });

server.on("connection", async (socket) => {
  const pc = new RTCPeerConnection();
  const session = await factory.create();

  session.onText.subscribe((res) => {
    console.log(res);
  });

  pc.addTransceiver("audio", { direction: "recvonly" }).onTrack.subscribe(
    (track) => {
      track.onReceiveRtp.subscribe((rtp) => {
        session.inputRtp(rtp).catch(() => {});
      });
    }
  );

  await pc.setLocalDescription(await pc.createOffer());
  const sdp = JSON.stringify(pc.localDescription);
  socket.send(sdp);

  socket.on("message", (data: any) => {
    pc.setRemoteDescription(JSON.parse(data));
  });
});
