"use client";

import { useSession, signOut } from "next-auth/react";
import { Avatar, Button, Flex, Link, Text } from "@radix-ui/themes";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <Flex gap="2">
        <Button variant="outline" asChild>
          <a href="/login">Sign in</a>
        </Button>
        <Button asChild>
          <a href="/signup">Sign up</a>
        </Button>
      </Flex>
    );
  }

  const isEmailUser = session.user.provider === "credentials";

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
      {isEmailUser && (
        <Link href="/settings" size="2">
          Settings
        </Link>
      )}
      <Button variant="soft" color="gray" size="1" onClick={() => signOut()}>
        Sign out
      </Button>
    </Flex>
  );
}
