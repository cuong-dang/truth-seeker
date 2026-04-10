"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Avatar, Button, Flex, Text } from "@radix-ui/themes";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <Button variant="outline" onClick={() => signIn("google")}>
        Sign in with Google
      </Button>
    );
  }

  return (
    <Flex align="center" gap="3">
      <Flex align="center" gap="2">
        <Avatar
          size="2"
          radius="full"
          src={session.user?.image ?? undefined}
          fallback={session.user?.name?.[0] ?? "?"}
        />
        <Text size="2">{session.user?.name}</Text>
      </Flex>
      <Button variant="soft" color="gray" size="1" onClick={() => signOut()}>
        Sign out
      </Button>
    </Flex>
  );
}
