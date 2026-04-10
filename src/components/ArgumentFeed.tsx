"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Flex, Text } from "@radix-ui/themes";
import type { Argument, Tag } from "@/types/argument";
import ArgumentCard from "./ArgumentCard";
import TagSidebar from "./TagSidebar";
import PostForm from "./PostForm";

export default function ArgumentFeed() {
  const { data: session } = useSession();
  const [arguments_, setArguments] = useState<Argument[]>([]);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
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

  async function handlePost(content: string, imageUrl?: string, tag?: Tag) {
    await fetch("/api/arguments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, imageUrl, tag }),
    });
    setShowPostForm(false);
    refresh();
  }

  async function handleAddQuestion(argumentId: string, content: string, imageUrl?: string) {
    await fetch(`/api/arguments/${argumentId}/question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, imageUrl }),
    });
    refresh();
  }

  async function handleAddSupport(argumentId: string, content: string, imageUrl?: string) {
    await fetch(`/api/arguments/${argumentId}/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, imageUrl }),
    });
    refresh();
  }

  async function handleAddCounter(argumentId: string, content: string, imageUrl?: string) {
    await fetch(`/api/arguments/${argumentId}/counter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, imageUrl }),
    });
    refresh();
  }

  async function handleAddReply(questionId: string, content: string, imageUrl?: string) {
    await fetch(`/api/questions/${questionId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, imageUrl }),
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

  // Compute tag counts from all root arguments
  const tagCounts: Record<string, number> = {};
  for (const arg of arguments_) {
    if (arg.tag) tagCounts[arg.tag] = (tagCounts[arg.tag] || 0) + 1;
  }

  const filtered = selectedTag
    ? arguments_.filter((arg) => arg.tag === selectedTag)
    : arguments_;

  const isSignedIn = !!session?.user;

  return (
    <Flex direction={{ initial: "column", md: "row" }} gap="6">
      <TagSidebar
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        tagCounts={tagCounts}
      />

      <Flex direction="column" gap="4" flexGrow="1" style={{ minWidth: 0 }}>
        {isSignedIn && (
          showPostForm ? (
            <PostForm
              placeholder="Post an argument..."
              submitLabel="Post"
              showTagPicker
              onSubmit={handlePost}
              onCancel={() => setShowPostForm(false)}
            />
          ) : (
            <Text
              size="3"
              color="gray"
              style={{ cursor: "pointer", padding: "12px 16px", border: "1px solid var(--gray-6)", borderRadius: 8 }}
              onClick={() => setShowPostForm(true)}
            >
              Post an argument...
            </Text>
          )
        )}

        {!isSignedIn && (
          <Text size="2" color="gray">Sign in to post arguments.</Text>
        )}

        {loading ? (
          <Text size="2" color="gray">Loading...</Text>
        ) : filtered.length === 0 ? (
          <Text size="2" color="gray">
            {selectedTag ? `No arguments tagged ${selectedTag.toLowerCase()} yet.` : "No arguments yet. Be the first to post one."}
          </Text>
        ) : (
          <Flex direction="column" gap="3">
            {filtered.map((arg) => (
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
    </Flex>
  );
}
