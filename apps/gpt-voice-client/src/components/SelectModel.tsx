import { Box, Button, Center } from "@chakra-ui/react";
import { FC } from "react";
import { BsTelephone } from "react-icons/bs";
import { useRecoilValue } from "recoil";
import { callConnection } from "../domain/call";
import { connectionStateAtom } from "../state";

export const SelectModel: FC = () => {
  const connectionState = useRecoilValue(connectionStateAtom);

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
      </Center>
    </Box>
  );
};
