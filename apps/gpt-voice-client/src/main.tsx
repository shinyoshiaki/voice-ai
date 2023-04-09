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

const initialState: {
  connectionState: "new" | "connecting" | "connected" | "disconnected";
  recognized: string;
  response: string;
  muted: boolean;
  aiState: "thinking" | "waiting" | "speaking";
} = {
  connectionState: "new",
  recognized: "　",
  response: "　",
  muted: false,
  aiState: "waiting",
};

const App: FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, updateState] = useReducer(
    (prev: typeof initialState, next: Partial<typeof initialState>) => ({
      ...prev,
      ...next,
    }),
    initialState
  );
  const localAudioRef = useRef<MediaStreamTrack>();
  const datachannelRef = useRef<RTCDataChannel>();

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
    localAudioRef.current = audio;

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
      datachannelRef.current = dc;
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
  };

  const switchMute = () => {
    if (!localAudioRef.current) {
      return;
    }
    if (state.muted) {
      localAudioRef.current.enabled = true;
      updateState({ muted: false });
    } else {
      localAudioRef.current.enabled = false;
      updateState({ muted: true });
    }
  };

  return (
    <div>
      <Box p={1}>
        <HStack>
          {state.connectionState === "new" && (
            <Button
              onClick={() => {
                start().catch((e) => {
                  window.alert(e.message);
                });
              }}
            >
              start
            </Button>
          )}
          {state.connectionState === "connected" && <Text>connected</Text>}
          {state.connectionState === "connecting" && <Spinner />}
        </HStack>
      </Box>
      <Box>
        <Box>
          <Text>自分</Text>
          <Box p={1}>
            {state.connectionState === "connected" &&
              state.aiState === "waiting" && <Text>認識中</Text>}
            <Text>{state.recognized}</Text>
            <Button onClick={switchMute}>
              {state.muted ? "unmute" : "mute"}
            </Button>
          </Box>
        </Box>
        <Box>
          <Text>AI</Text>
          <Box>
            {state.aiState === "waiting" && <Text>待機中</Text>}
            {state.aiState === "speaking" && <Text>発声中</Text>}
            {state.aiState === "thinking" && <Text>思考中</Text>}
            <Text>{state.response}</Text>
          </Box>
          <Box p={1}>
            <audio controls autoPlay ref={audioRef} />
          </Box>
          <Box p={1}>
            <Button
              onClick={() => {
                const dc = datachannelRef.current;
                if (!dc) return;
                dc.send(JSON.stringify({ type: "clearHistory" }));
              }}
            >
              記憶を消す
            </Button>
          </Box>
        </Box>
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
