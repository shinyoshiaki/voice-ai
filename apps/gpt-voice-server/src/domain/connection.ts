import Event from "rx.mini";
import {
  RTCPeerConnection,
  RtpPacket,
  RTCIceCandidate,
  RTCRtpHeaderExtensionParameters,
  RTP_EXTENSION_URI,
  RTCRtpCodecParameters,
} from "werift";

export class CallConnection {
  private pc = new RTCPeerConnection({
    headerExtensions: {
      audio: [
        new RTCRtpHeaderExtensionParameters({
          uri: RTP_EXTENSION_URI.audioLevelIndication,
        }),
      ],
    },
    codecs: {
      audio: [
        new RTCRtpCodecParameters({
          mimeType: "audio/pcmu",
          payloadType: 0,
          clockRate: 8000,
          channels: 1,
          direction: "sendonly",
        }),
        new RTCRtpCodecParameters({
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
          direction: "recvonly",
        }),
      ],
    },
  });
  private receiver = this.pc.addTransceiver("audio", {
    direction: "recvonly",
  });
  private sender = this.pc.addTransceiver("audio", {
    direction: "sendonly",
  });
  private dc = this.pc.createDataChannel("messaging");
  onRtp = new Event<[RtpPacket]>();
  onMessage = new Event<[string]>();
  onClosed = new Event();

  constructor() {
    this.receiver.onTrack.once((track) => {
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

  get extIdUriMap() {
    return this.pc.extIdUriMap;
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
    await this.sender.sender.sendRtp(rtp);
  }

  sendMessage<T = object>(message: T) {
    this.dc.send(JSON.stringify(message));
  }

  stop() {
    this.pc.close();
    this.onRtp.allUnsubscribe();
    this.onMessage.allUnsubscribe();
  }
}
