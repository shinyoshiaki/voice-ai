import { Box, Button, Center, HStack, Select, Spinner } from "@chakra-ui/react";
import { FC, useEffect, useState } from "react";
import { BsTelephone } from "react-icons/bs";
import { useRecoilValue } from "recoil";
import { callConnection } from "../domain/call";
import { connectionStateAtom } from "../state";
import { ChangeModel } from "@shinyoshiaki/gpt-voice-rpc";

export const HeaderController: FC = () => {
  const connectionState = useRecoilValue(connectionStateAtom);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!callConnection.ready) await callConnection.onReady.asPromise();
      setModels(callConnection.models);
    })();
  }, []);

  const changeModel = (model: string) => {
    callConnection.sendMessage<ChangeModel>({
      type: "changeModel",
      payload: { model },
    });
  };

  return (
    <Box>
      <Center>
        {connectionState === "new" && (
          <Button
            onClick={() => callConnection.call()}
            leftIcon={<BsTelephone />}
          >
            start call
          </Button>
        )}
        {connectionState === "connecting" && <Spinner />}
        {connectionState === "connected" && (
          <HStack>
            <Select onChange={(e) => changeModel(e.target.value)}>
              {models.map((model) => (
                <option value={model} key={model}>
                  {model}
                </option>
              ))}
            </Select>
          </HStack>
        )}
      </Center>
    </Box>
  );
};
