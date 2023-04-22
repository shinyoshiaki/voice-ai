import { FC, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { ChakraProvider, Text, Spinner, Box, HStack } from "@chakra-ui/react";
import { Controller } from "./components/Controller";
import { SelectModel } from "./components/SelectModel";
import { callConnection } from "./domain/call";
import { RecoilRoot, useRecoilState, useRecoilValue } from "recoil";
import { ChatLogs } from "./components/ChatLog";
import { chatLogsAtom, connectionStateAtom } from "./state";

const App: FC = () => {
  const contentRef = useRef<HTMLDivElement>();
  const [connectionState, setConnectionState] =
    useRecoilState(connectionStateAtom);
  const chatLogs = useRecoilValue(chatLogsAtom);

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
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      console.log("scroll", contentRef.current.scrollHeight);
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [chatLogs]);

  return (
    <Box>
      <Box p={5}>
        <SelectModel />
      </Box>
      <Box p={1}>
        <HStack>
          {connectionState === "connected" && <Text>connected</Text>}
          {connectionState === "connecting" && <Spinner />}
        </HStack>
      </Box>
      <Box p={2} overflowY="auto" ref={contentRef} h="calc(100vh - 230px)">
        <ChatLogs />
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
    </Box>
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
