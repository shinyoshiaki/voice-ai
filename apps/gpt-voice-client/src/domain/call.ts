import Event from "rx.mini";
import { env } from "../../env";

const endpoint = env.endpoint;

class CallConnection {
  peer!: RTCPeerConnection;
  localAudio!: MediaStreamTrack;
  datachannel!: RTCDataChannel;
  onConnectionstateChange = new Event<[RTCPeerConnectionState]>();
  onMessage = new Event<[{ type: string; payload: any }]>();
  onAudioStream = new Event<[MediaStream]>();

  async call() {
    const peer = new RTCPeerConnection({
      // iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.peer = peer;
    const socket = new WebSocket(endpoint);

    const offer = await new Promise<any>(
      (r) => (socket.onmessage = (ev) => r(JSON.parse(ev.data)))
    );

    peer.onicecandidate = ({ candidate }) => {
      if (!candidate) {
        const sdp = JSON.stringify(peer.localDescription);
        socket.send(sdp);
      }
    };

    peer.ontrack = (e) => {
      this.onAudioStream.execute(new MediaStream([e.track]));
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const [audio] = stream.getAudioTracks();
    peer.addTrack(audio);
    this.localAudio = audio;

    peer.onconnectionstatechange = () => {
      this.onConnectionstateChange.execute(peer.connectionState);
    };

    peer.ondatachannel = (e) => {
      const dc = e.channel;
      this.datachannel = dc;
      dc.onmessage = (e) => {
        const { type, payload } = JSON.parse(e.data);
        this.onMessage.execute({ type, payload });
      };
    };

    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
  }

  sendMessage(type: string, payload: any = {}) {
    this.datachannel.send(JSON.stringify({ type, payload }));
  }
}

export const callConnection = new CallConnection();
