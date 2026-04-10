"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button, DropdownMenu, Flex, Text } from "@radix-ui/themes";
import { CaretSortIcon } from "@radix-ui/react-icons";
import type { Argument, Tag } from "@/types/argument";
import ArgumentCard from "./ArgumentCard";
import TagSidebar from "./TagSidebar";
import PostForm from "./PostForm";

const PAGE_SIZE = 10;

export default function ArgumentFeed() {
  const { data: session } = useSession();
  const [arguments_, setArguments] = useState<Argument[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "votes" | "replies">("newest");
  const [showPostForm, setShowPostForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch a page of root arguments
  const fetchPage = useCallback(async (skip: number, sort: string) => {
    const res = await fetch(`/api/arguments?skip=${skip}&limit=${PAGE_SIZE}&sort=${sort}`);
    const data = await res.json();
    setArguments((prev) => skip === 0 ? data.arguments : [...prev, ...data.arguments]);
    setTotal(data.total);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  // Initial load + reload on sort change
  useEffect(() => {
    setLoading(true);
    setArguments([]);
    setTotal(0);
    fetchPage(0, sortOrder);
  }, [fetchPage, sortOrder]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && arguments_.length > 0 && arguments_.length < total && !loadingMore && !loading) {
          setLoadingMore(true);
          fetchPage(arguments_.length, sortOrder);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [arguments_.length, total, loadingMore, loading, fetchPage, sortOrder]);

  // Refresh reloads everything currently loaded
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/arguments?skip=0&limit=${Math.max(arguments_.length, PAGE_SIZE)}&sort=${sortOrder}`);
    const data = await res.json();
    setArguments(data.arguments);
    setTotal(data.total);
  }, [arguments_.length, sortOrder]);

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

  // Compute tag counts from loaded root arguments
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

        <Flex justify="end">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="ghost" color="gray" size="2">
                <CaretSortIcon />
                {{ newest: "Newest", oldest: "Oldest", votes: "Top voted", replies: "Most replies" }[sortOrder]}
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content size="1">
              <DropdownMenu.Item onClick={() => setSortOrder("newest")}>Newest</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => setSortOrder("oldest")}>Oldest</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => setSortOrder("votes")}>Top voted</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => setSortOrder("replies")}>Most replies</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>

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

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {loadingMore && (
          <Text size="2" color="gray" align="center">Loading more...</Text>
        )}
      </Flex>
    </Flex>
  );
}
