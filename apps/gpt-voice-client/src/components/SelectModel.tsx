import { Box, Button, Center } from "@chakra-ui/react";
import { FC } from "react";
import { BsTelephone } from "react-icons/bs";

export const SelectModel: FC = () => {
  return (
    <Box>
      <Center>
        <Button leftIcon={<BsTelephone />}>start call</Button>
      </Center>
    </Box>
  );
};
