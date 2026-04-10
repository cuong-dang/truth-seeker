import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import ArgumentFeed from "@/components/ArgumentFeed";
import AuthButton from "@/components/AuthButton";

export default function Home() {
  return (
    <Container size="4" py="9" px="4">
      <Flex gap="6">
        <Flex direction="column" gap="6" flexGrow="1" style={{ minWidth: 0 }}>
          <Flex justify="between" align="start">
            <Flex direction="column" gap="1">
              <Heading size="7">Truth Seeker</Heading>
              <Text size="3" color="gray">
                One point per post. Question it, support it, or counter it.
              </Text>
            </Flex>
            <AuthButton />
          </Flex>
          <ArgumentFeed />
        </Flex>
      </Flex>
    </Container>
  );
}
