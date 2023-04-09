import React, { FC, useReducer, useRef } from "react";
import ReactDOM from "react-dom";
import { env } from "../../../env";
import {
  ChakraProvider,
  Button,
  Text,
  Spinner,
  Box,
  HStack,
} from "@chakra-ui/react";

const endpoint = env.endpoint;

const peer = new RTCPeerConnection({});

interface State {
  connectionState: "new" | "connecting" | "connected" | "disconnected";
}

const App: FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, updateState] = useReducer(
    (prev: State, next: State) => ({ ...prev, ...next }),
    { connectionState: "new" }
  );

  const start = async () => {
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
      const audio = audioRef.current!;
      audio.srcObject = new MediaStream([e.track]);
      audio.play();
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const [audio] = stream.getAudioTracks();
    peer.addTrack(audio);

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
          }
          break;
      }
    };

    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
  };

  return (
    <div>
      <Box p={1}>
        <HStack>
          <Button onClick={start}>start</Button>
          {state.connectionState === "connected" && <Text>connected</Text>}
          {state.connectionState === "connecting" && <Spinner />}
        </HStack>
      </Box>
      <Box>
        <audio controls autoPlay ref={audioRef} />
      </Box>
    </div>
  );
};

ReactDOM.render(
  <ChakraProvider>
    <App />
  </ChakraProvider>,
  document.getElementById("root")
);
