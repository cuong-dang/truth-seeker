"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, Callout, Card, Container, Flex, Heading, Link, Separator, Text, TextField } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container size="1" py="9">
      <Card size="3">
        <Flex direction="column" gap="5">
          <Heading size="6" align="center">Sign in</Heading>

          {verified && (
            <Callout.Root color="green">
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                Email verified! You can now sign in.
              </Callout.Text>
            </Callout.Root>
          )}

          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <Box>
                <Text as="label" size="2" weight="medium" mb="1">Email</Text>
                <TextField.Root
                  size="3"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Box>
              <Box>
                <Text as="label" size="2" weight="medium" mb="1">Password</Text>
                <TextField.Root
                  size="3"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Box>

              {error && (
                <Callout.Root color="red" size="1">
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}

              <Button size="3" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </Flex>
          </form>

          <Flex align="center" gap="3">
            <Separator size="4" />
            <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>or</Text>
            <Separator size="4" />
          </Flex>

          <Button
            size="3"
            variant="outline"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            Sign in with Google
          </Button>

          <Text size="2" color="gray" align="center">
            Don&apos;t have an account? <Link href="/signup">Sign up</Link>
          </Text>
        </Flex>
      </Card>
    </Container>
  );
}
