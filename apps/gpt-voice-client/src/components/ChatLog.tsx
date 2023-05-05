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

const thinkingWord = "思考中";

export const ChatLogs: FC = () => {
  const [chatLogs, setChatLogs] = useRecoilState(chatLogsAtom);

  const addLog = (log: ChatLog, role: "user" | "assistant") => {
    setChatLogs((prev) => ({
      ...Object.keys(prev).reduce((acc, cur) => {
        if (Number(cur) < log.index) {
          acc[cur] = prev[cur];
        }
        return acc;
      }, {}),
      [log.index]: {
        content: log.content,
        role,
        index: log.index,
      },
    }));
  };

  useEffect(() => {
    callConnection.onMessage.subscribe((event) => {
      const { type, payload } = event as
        | AssistantFunctions
        | ChatFunctions
        | UserFunctions;

      console.log({ type, payload });
      switch (type) {
        case "recognized":
          {
            addLog(payload, "user");
          }
          break;
        case "response":
          {
            addLog(payload, "assistant");
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
                  content: thinkingWord,
                  index: latest.index + 1,
                },
              };
            });
          }
          break;
        case "waiting":
          {
            setChatLogs((prev) => {
              const latest = Object.values(prev)
                .sort((a, b) => a.index - b.index)
                .at(-1);
              prev =
                latest.content === thinkingWord
                  ? (() => {
                      const { [latest.index]: _, ...next } = prev;
                      return next;
                    })()
                  : prev;

              return {
                ...prev,
                [latest.index + 1]: {
                  role: "assistant",
                  content: "待機中",
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
        .map((chatLog) => (
          <ChatLogView log={chatLog} key={chatLog.index} />
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
