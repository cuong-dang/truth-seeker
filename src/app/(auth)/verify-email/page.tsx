import { Card, Container, Flex, Heading, Link, Text } from "@radix-ui/themes";

export default function VerifyEmailPage() {
  return (
    <Container size="1" py="9">
      <Card size="3">
        <Flex direction="column" gap="4" align="center">
          <Heading size="6">Check your email</Heading>
          <Text size="3" color="gray" align="center">
            We sent a verification link to your email address.
            Please verify within <Text weight="bold">7 days</Text> or your account will be removed.
          </Text>
          <Text size="2" color="gray">
            <Link href="/login">Back to sign in</Link>
          </Text>
        </Flex>
      </Card>
    </Container>
  );
}
