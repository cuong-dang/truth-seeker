import { Button, Container, Flex, Heading, Text } from "@radix-ui/themes";

export default function Home() {
  return (
    <Container size="2" py="9">
      <Flex direction="column" align="center" gap="4">
        <Heading size="7">Truth Seeker</Heading>
        <Text size="3" color="gray">
          Your app starts here.
        </Text>
        <Button size="3">Get Started</Button>
      </Flex>
    </Container>
  );
}
