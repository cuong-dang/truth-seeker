import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import ArgumentFeed from "@/components/ArgumentFeed";
import AuthButton from "@/components/AuthButton";

export default function Home() {
  return (
    <Container size="4" py="6" px="4">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="start" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Heading size={{ initial: "5", sm: "7" }}>Truth Seeker</Heading>
            <Text size={{ initial: "2", sm: "3" }} color="gray">
              One point per post. Question it, support it, or counter it.
            </Text>
          </Flex>
          <AuthButton />
        </Flex>
        <ArgumentFeed />
      </Flex>
    </Container>
  );
}
