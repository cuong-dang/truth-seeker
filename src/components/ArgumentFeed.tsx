"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button, Flex, Text, TextArea } from "@radix-ui/themes";
import type { Argument } from "@/types/argument";
import ArgumentCard from "./ArgumentCard";

export default function ArgumentFeed() {
  const { data: session } = useSession();
  const [arguments_, setArguments] = useState<Argument[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/arguments");
    const data = await res.json();
    setArguments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handlePost() {
    const content = draft.trim();
    if (!content) return;
    await fetch("/api/arguments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setDraft("");
    refresh();
  }

  async function handleAddQuestion(argumentId: string, content: string) {
    await fetch(`/api/arguments/${argumentId}/question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    refresh();
  }

  async function handleAddSupport(argumentId: string, content: string) {
    await fetch(`/api/arguments/${argumentId}/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    refresh();
  }

  async function handleAddCounter(argumentId: string, content: string) {
    await fetch(`/api/arguments/${argumentId}/counter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    refresh();
  }

  async function handleAddReply(questionId: string, content: string) {
    await fetch(`/api/questions/${questionId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    refresh();
  }

  async function handleVoteArgument(argumentId: string, value: number) {
    await fetch(`/api/arguments/${argumentId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    refresh();
  }

  async function handleVoteQuestion(questionId: string, value: number) {
    await fetch(`/api/questions/${questionId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    refresh();
  }

  const isSignedIn = !!session?.user;

  return (
    <Flex direction="column" gap="4">
      {isSignedIn ? (
        <Flex direction="column" gap="2">
          <TextArea
            size="3"
            placeholder="Post an argument..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handlePost();
            }}
          />
          <Flex justify="end">
            <Button size="2" onClick={handlePost} disabled={!draft.trim()}>
              Post
            </Button>
          </Flex>
        </Flex>
      ) : (
        <Text size="2" color="gray">
          Sign in to post arguments.
        </Text>
      )}

      {loading ? (
        <Text size="2" color="gray">Loading...</Text>
      ) : arguments_.length === 0 ? (
        <Text size="2" color="gray">No arguments yet. Be the first to post one.</Text>
      ) : (
        <Flex direction="column" gap="3">
          {arguments_.map((arg) => (
            <ArgumentCard
              key={arg.id}
              argument={arg}
              isSignedIn={isSignedIn}
              onAddQuestion={handleAddQuestion}
              onAddSupport={handleAddSupport}
              onAddCounter={handleAddCounter}
              onAddReply={handleAddReply}
              onVoteArgument={handleVoteArgument}
              onVoteQuestion={handleVoteQuestion}
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
}
