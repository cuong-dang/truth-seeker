"use client";

import { useState } from "react";
import {
  Avatar, Badge, Box, Button, Card, DropdownMenu, Flex, IconButton, Text,
} from "@radix-ui/themes";
import {
  CaretSortIcon, ChatBubbleIcon, Pencil2Icon,
  ThickArrowDownIcon, ThickArrowUpIcon,
} from "@radix-ui/react-icons";
import type { Argument, Question } from "@/types/argument";
import { timeAgo } from "@/lib/timeAgo";
import ArgumentCard from "./ArgumentCard";

function deepReplyCount(arg: Argument): number {
  let count = arg.questions.length + arg.supports.length + arg.counters.length;
  for (const q of arg.questions) {
    count += q.replies.length;
    for (const r of q.replies) count += deepReplyCount(r);
  }
  for (const s of arg.supports) count += deepReplyCount(s);
  for (const c of arg.counters) count += deepReplyCount(c);
  return count;
}

function deepQuestionReplyCount(question: Question): number {
  let count = question.replies.length;
  for (const r of question.replies) count += deepReplyCount(r);
  return count;
}
import PostForm from "./PostForm";

type SortOrder = "votes" | "newest" | "oldest";

interface QuestionCardProps {
  question: Question;
  isSignedIn: boolean;
  expandAll?: boolean;
  onAddQuestion: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddSupport: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddCounter: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddReply: (questionId: string, content: string, imageUrl?: string) => void;
  onVoteArgument: (argumentId: string, value: number) => void;
  onVoteQuestion: (questionId: string, value: number) => void;
}

const sortLabels: Record<SortOrder, string> = {
  votes: "Top voted",
  newest: "Newest first",
  oldest: "Oldest first",
};

function sortReplies(replies: Argument[], sort: SortOrder): Argument[] {
  return [...replies].sort((a, b) => {
    if (sort === "votes") return b.score - a.score;
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export default function QuestionCard({
  question,
  isSignedIn,
  onAddQuestion,
  onAddSupport,
  onAddCounter,
  onAddReply,
  onVoteArgument,
  onVoteQuestion,
  expandAll,
}: QuestionCardProps) {
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("oldest");
  const [showReplyForm, setShowReplyForm] = useState(false);
  const effectiveRepliesExpanded = expandAll || repliesExpanded;

  function handleReplySubmit(content: string, imageUrl?: string) {
    onAddReply(question.id, content, imageUrl);
    setShowReplyForm(false);
  }

  const childProps = { isSignedIn, onAddQuestion, onAddSupport, onAddCounter, onAddReply, onVoteArgument, onVoteQuestion, expandAll };

  return (
    <Flex direction="column" gap="2">
      <Card variant="surface">
        <Flex gap="3">
          {isSignedIn && (
            <Flex direction="column" align="center" gap="0" style={{ minWidth: 32 }}>
              <IconButton
                size="1"
                variant={question.userVote === 1 ? "solid" : "ghost"}
                color="green"
                onClick={() => onVoteQuestion(question.id, 1)}
              >
                <ThickArrowUpIcon />
              </IconButton>
              <Text size="2" weight="medium" color={question.score > 0 ? "green" : question.score < 0 ? "red" : "gray"}>
                {question.score}
              </Text>
              <IconButton
                size="1"
                variant={question.userVote === -1 ? "solid" : "ghost"}
                color="red"
                onClick={() => onVoteQuestion(question.id, -1)}
              >
                <ThickArrowDownIcon />
              </IconButton>
            </Flex>
          )}
          <Flex direction="column" gap="2" flexGrow="1">
            <Flex gap="2" align="center">
              <Badge color="purple" variant="soft" size="1">
                Question
              </Badge>
              <Avatar
                size="1"
                radius="full"
                src={question.author.image ?? undefined}
                fallback={question.author.name?.[0] ?? "?"}
              />
              <Text size="1" color="gray">{question.author.name}</Text>
              <Text size="1" color="gray">·</Text>
              <Text size="1" color="gray">{timeAgo(question.createdAt)}</Text>
            </Flex>
            <Text size="2">{question.content}</Text>
            {question.imageUrl && (
              <Box style={{ borderRadius: 6, overflow: "hidden", maxWidth: 400 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={question.imageUrl} alt="" style={{ width: "100%", display: "block" }} />
              </Box>
            )}
            <Flex gap="4" align="center">
              <Flex gap="1" align="center">
                <IconButton
                  size="1"
                  variant={effectiveRepliesExpanded ? "solid" : "ghost"}
                  color="cyan"
                  disabled={question.replies.length === 0}
                  onClick={() => setRepliesExpanded(!repliesExpanded)}
                >
                  <ChatBubbleIcon />
                </IconButton>
                <Text size="1" color="gray">{question.replies.length}</Text>
              </Flex>

              {deepQuestionReplyCount(question) > 0 && (
                <Flex gap="1" align="center">
                  <ChatBubbleIcon width="14" height="14" color="var(--gray-9)" />
                  <Text size="1" color="gray">{deepQuestionReplyCount(question)} replies</Text>
                </Flex>
              )}

              {effectiveRepliesExpanded && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <Button variant="ghost" color="gray" size="1">
                      <CaretSortIcon />
                      {sortLabels[sortOrder]}
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content size="1">
                    <DropdownMenu.Item onClick={() => setSortOrder("votes")}>Top voted</DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => setSortOrder("newest")}>Newest first</DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => setSortOrder("oldest")}>Oldest first</DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}

              {isSignedIn && (
                <IconButton
                  size="1"
                  variant={showReplyForm ? "solid" : "ghost"}
                  color="gray"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                >
                  <Pencil2Icon />
                </IconButton>
              )}
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {showReplyForm && (
        <Box className="thread-indent">
          <PostForm
            placeholder="Write a reply..."
            submitLabel="Reply"
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReplyForm(false)}
          />
        </Box>
      )}

      {effectiveRepliesExpanded && question.replies.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--cyan-6)" }}>
          <Flex direction="column" gap="2">
            {sortReplies(question.replies, sortOrder).map((r) => (
              <ArgumentCard key={r.id} argument={r} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}
