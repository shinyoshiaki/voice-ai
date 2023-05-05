import { Box, Text } from "@chakra-ui/react";
import { FC, useEffect } from "react";

import { ChatLog, chatLogsAtom } from "../state";
import { callConnection } from "../domain/call";
import { useRecoilState } from "recoil";
import {
  AssistantFunctions,
  ChatFunctions,
  UserFunctions,
} from "@shinyoshiaki/gpt-voice-rpc";

export const ChatLogs: FC = () => {
  const [chatLogs, setChatLogs] = useRecoilState(chatLogsAtom);

  useEffect(() => {
    callConnection.onMessage.subscribe((event) => {
      const { type, payload } = event as
        | AssistantFunctions
        | ChatFunctions
        | UserFunctions;
      switch (type) {
        case "recognized":
          {
            setChatLogs((prev) => ({
              ...prev,
              [payload.index]: {
                content: payload.content,
                role: "user",
                index: payload.index,
              },
            }));
          }
          break;
        case "response":
          {
            setChatLogs((prev) => ({
              ...prev,
              [payload.index]: {
                content: payload.content,
                role: "assistant",
                index: payload.index,
              },
            }));
          }
          break;
        case "thinking":
          {
            setChatLogs((prev) => {
              const latest = Object.values(prev)
                .sort((a, b) => a.index - b.index)
                .at(-1);
              return {
                ...prev,
                [latest.index + 1]: {
                  role: "assistant",
                  content: "思考中",
                  index: latest.index + 1,
                },
              };
            });
          }
          break;
      }
    });
  }, []);

  return (
    <Box>
      {Object.values(chatLogs)
        .sort((a, b) => a.index - b.index)
        .map((chatLog, i) => (
          <ChatLogView log={chatLog} key={i} />
        ))}
    </Box>
  );
};

const ChatLogView: FC<{ log: ChatLog }> = ({ log }) => {
  return (
    <Box>
      <Text>
        {log.role} {log.content}
      </Text>
    </Box>
  );
};
