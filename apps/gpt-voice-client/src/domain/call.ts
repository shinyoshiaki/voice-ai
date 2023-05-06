import Event from "rx.mini";
import { env } from "../../env";
import { Api } from "@shinyoshiaki/gpt-voice-api";

const endpoint = env.endpoint;
const api = new Api({ baseUrl: endpoint });

class CallConnection {
  peer!: RTCPeerConnection;
  localAudio!: MediaStreamTrack;
  datachannel!: RTCDataChannel;
  onConnectionstateChange = new Event<[RTCPeerConnectionState]>();
  onMessage = new Event<[{ type: string; payload: any }]>();
  onAudioStream = new Event<[MediaStream]>();

  async call() {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.peer = peer;
    const { sdp, sessionId } = (await api.call.callCreate()).data;

    peer.onicecandidate = async ({ candidate }) => {
      if (candidate) {
        await api.call.iceCandidateUpdate(sessionId, { candidate });
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

    await peer.setRemoteDescription(sdp as any);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await api.call.answerUpdate(sessionId, { sdp: peer.localDescription });
  }

  sendMessage<T = object>(message: T) {
    this.datachannel.send(JSON.stringify(message));
  }
}

export const callConnection = new CallConnection();
