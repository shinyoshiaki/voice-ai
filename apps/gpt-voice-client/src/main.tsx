import React, { FC, useRef } from "react";
import ReactDOM from "react-dom";

const peer = new RTCPeerConnection({});

const App: FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const start = async () => {
    const socket = new WebSocket("ws://localhost:8888");

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
      const audio = audioRef.current!;
      audio.srcObject = new MediaStream([e.track]);
      audio.play();
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const [audio] = stream.getAudioTracks();
    peer.addTrack(audio);

    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
  };

  return (
    <div>
      <button onClick={start}>start</button>
      <audio controls autoPlay ref={audioRef} />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
