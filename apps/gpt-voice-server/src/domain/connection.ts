import Event from "rx.mini";
import { RTCPeerConnection, RtpPacket } from "werift";

export class CallConnection {
  pc = new RTCPeerConnection();
  transceiver = this.pc.addTransceiver("audio", { direction: "sendrecv" });
  dc = this.pc.createDataChannel("messaging");
  onRtp = new Event<[RtpPacket]>();
  onMessage = new Event<[string]>();

  constructor() {
    this.transceiver.onTrack.once((track) => {
      track.onReceiveRtp.subscribe((rtp) => {
        this.onRtp.execute(rtp);
      });
    });
    this.dc.message.subscribe((s) => this.onMessage.execute(s as string));
  }

  async offer() {
    await this.pc.setLocalDescription(await this.pc.createOffer());
    const sdp = JSON.stringify(this.pc.localDescription);
    return sdp;
  }

  async answer(answer: { type: "offer" | "answer"; sdp: string }) {
    await this.pc.setRemoteDescription(answer).catch((e) => e);
  }

  async sendRtp(rtp: RtpPacket) {
    await this.transceiver.sender.sendRtp(rtp);
  }

  send(message: object) {
    this.dc.send(JSON.stringify(message));
  }
}
