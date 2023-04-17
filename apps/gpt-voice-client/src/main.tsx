import { FC, useEffect, useReducer, useRef } from "react";
import ReactDOM from "react-dom";
import {
  ChakraProvider,
  Button,
  Text,
  Spinner,
  Box,
  HStack,
} from "@chakra-ui/react";
import { Controller } from "./components/Controller";
import { SelectModel } from "./components/SelectModel";
import { callConnection, connectionStateAtom } from "./domain/call";
import { RecoilRoot, useRecoilState } from "recoil";

const initialState: {
  recognized: string;
  response: string;
  muted: boolean;
  aiState: "thinking" | "waiting" | "speaking";
} = {
  recognized: "　",
  response: "　",
  muted: false,
  aiState: "waiting",
};

const App: FC = () => {
  const [state, updateState] = useReducer(
    (prev: typeof initialState, next: Partial<typeof initialState>) => ({
      ...prev,
      ...next,
    }),
    initialState
  );
  const [connectionState, setConnectionState] =
    useRecoilState(connectionStateAtom);

  useEffect(() => {
    callConnection.onConnectionstateChange.subscribe((connectionState) => {
      switch (connectionState) {
        case "connecting":
          {
            setConnectionState("connecting");
          }
          break;
        case "connected":
          {
            console.log("connected");
            setConnectionState("connected");
          }
          break;
        case "disconnected":
        case "failed":
          {
            setConnectionState("disconnected");
            window.alert("切断されました");
          }
          break;
      }
    });
    callConnection.onMessage.subscribe(({ type, payload }) => {
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
    });
  }, []);

  return (
    <div>
      <Box p={5}>
        <SelectModel />
      </Box>
      <Box p={1}>
        <HStack>
          {connectionState === "connected" && <Text>connected</Text>}
          {connectionState === "connecting" && <Spinner />}
        </HStack>
      </Box>
      <Box>
        <Box>
          <Text>自分</Text>
          <Box p={1}>
            {connectionState === "connected" && state.aiState === "waiting" && (
              <Text>認識中</Text>
            )}
            <Text>{state.recognized}</Text>
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
            <Button
              onClick={() => {
                callConnection.sendMessage("clearHistory");
              }}
            >
              記憶を消す
            </Button>
          </Box>
        </Box>
      </Box>
      <Box
        p={2}
        position="fixed"
        bottom="0"
        width="100%"
        zIndex="sticky"
        bg="white"
      >
        <Controller />
      </Box>
    </div>
  );
};

ReactDOM.render(
  <ChakraProvider>
    <RecoilRoot>
      <App />
    </RecoilRoot>
  </ChakraProvider>,
  document.getElementById("root")
);
