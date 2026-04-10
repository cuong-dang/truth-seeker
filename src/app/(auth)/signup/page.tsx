"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Callout, Card, Container, Flex, Heading, Link, Text, TextField } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/verify-email");
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
          <Heading size="6" align="center">Create an account</Heading>

          <Callout.Root color="blue">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              You must verify your email within 7 days or your account will be removed.
            </Callout.Text>
          </Callout.Root>

          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <Box>
                <Text as="label" size="2" weight="medium" mb="1">Name</Text>
                <TextField.Root
                  size="3"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Box>
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
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </Box>

              {error && (
                <Callout.Root color="red" size="1">
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}

              <Button size="3" type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Sign up"}
              </Button>
            </Flex>
          </form>

          <Text size="2" color="gray" align="center">
            Already have an account? <Link href="/login">Sign in</Link>
          </Text>
        </Flex>
      </Card>
    </Container>
  );
}
