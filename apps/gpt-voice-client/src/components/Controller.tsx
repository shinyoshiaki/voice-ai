import { ArrowForwardIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Center,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { FC } from "react";
import { BsMic, BsMicMute, BsSquare } from "react-icons/bs";

export const Controller: FC<{}> = () => {
  return (
    <Box>
      <Center p={2}>
        <Button leftIcon={<BsSquare />}>stop</Button>
      </Center>
      <HStack>
        <IconButton icon={<Icon as={BsMic} />} aria-label="mute-unmute" />
        <InputGroup>
          <Input placeholder="Send a message..." />
          <InputRightElement>
            <IconButton
              icon={<ArrowForwardIcon />}
              aria-label="send"
              type="submit"
            />
          </InputRightElement>
        </InputGroup>
      </HStack>
      <Box p={3} />
    </Box>
  );
};
