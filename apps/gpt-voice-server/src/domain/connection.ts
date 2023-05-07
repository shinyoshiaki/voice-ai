import Event from "rx.mini";
import { RTCPeerConnection, RtpPacket, RTCIceCandidate } from "werift";

export class CallConnection {
  private pc = new RTCPeerConnection();
  private transceiver = this.pc.addTransceiver("audio", {
    direction: "sendrecv",
  });
  private dc = this.pc.createDataChannel("messaging");
  onRtp = new Event<[RtpPacket]>();
  onMessage = new Event<[string]>();
  onClosed = new Event();

  constructor() {
    this.transceiver.onTrack.once((track) => {
      track.onReceiveRtp.subscribe((rtp) => {
        this.onRtp.execute(rtp);
      });
    });
    this.dc.message.subscribe((message) => {
      this.onMessage.execute(message as string);
    });
    this.pc.iceConnectionStateChange.subscribe((state) => {
      if (state === "closed") {
        this.onClosed.execute();
      }
    });
  }

  async offer() {
    await this.pc.setLocalDescription(await this.pc.createOffer());
    return this.pc.localDescription!;
  }

  async answer(answer: { type: "offer" | "answer"; sdp: string }) {
    await this.pc.setRemoteDescription(answer).catch((e) => e);
  }

  async addIceCandidate(ice: RTCIceCandidate) {
    await this.pc.addIceCandidate(ice);
  }

  async sendRtp(rtp: RtpPacket) {
    await this.transceiver.sender.sendRtp(rtp);
  }

  sendMessage<T = object>(message: T) {
    this.dc.send(JSON.stringify(message));
  }
}
