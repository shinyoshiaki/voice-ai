import { env } from "../../../../env";

const endpoint = env.endpoint;

class CallConnection {
  peer!: RTCPeerConnection;
  localAudio!: MediaStreamTrack;
  datachannel!: RTCDataChannel;

  async call(audioElm: HTMLAudioElement) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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
      const audio = audioElm;
      audio.srcObject = new MediaStream([e.track]);
      audio.play();
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const [audio] = stream.getAudioTracks();
    peer.addTrack(audio);
    this.localAudio = audio;

    peer.onconnectionstatechange = () => {
      switch (peer.connectionState) {
        case "connecting":
          {
            updateState({ connectionState: "connecting" });
          }
          break;
        case "connected":
          {
            updateState({ connectionState: "connected" });
          }
          break;
        case "disconnected":
        case "failed":
          {
            updateState({ connectionState: "disconnected" });
            window.alert("切断されました");
          }
          break;
      }
    };

    peer.ondatachannel = (e) => {
      const dc = e.channel;
      this.datachannel = dc;
      dc.onmessage = (e) => {
        const { type, payload } = JSON.parse(e.data);
        switch (type) {
          case "recognized":
            {
              updateState({ recognized: payload });
            }
            break;
          case "response":
            {
              updateState({ response: payload });
            }
            break;
          case "thinking":
            {
              updateState({ aiState: "thinking" });
            }
            break;
          case "speaking":
            {
              updateState({ aiState: "speaking" });
            }
            break;
          case "waiting":
            {
              updateState({ aiState: "waiting" });
            }
            break;
        }
      };
    };

    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
  }
}

export const peerConnection = new CallConnection();
