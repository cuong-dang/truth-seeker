import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import ArgumentFeed from "@/components/ArgumentFeed";
import AuthButton from "@/components/AuthButton";

export default function Home() {
  return (
    <Container size="2" py="9">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="start">
          <Flex direction="column" gap="1">
            <Heading size="7">Truth Seeker</Heading>
            <Text size="3" color="gray">
              Post arguments. Question, support, or counter them.
            </Text>
          </Flex>
          <AuthButton />
        </Flex>
        <ArgumentFeed />
      </Flex>
    </Container>
  );
}
