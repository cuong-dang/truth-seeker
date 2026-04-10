"use client";

import { useState } from "react";
import { Badge, Box, Button, Card, Flex, IconButton, Text, TextArea } from "@radix-ui/themes";
import { ThickArrowUpIcon, ThickArrowDownIcon } from "@radix-ui/react-icons";
import type { Question } from "@/types/argument";
import ArgumentCard from "./ArgumentCard";

interface QuestionCardProps {
  question: Question;
  isSignedIn: boolean;
  onAddQuestion: (argumentId: string, content: string) => void;
  onAddSupport: (argumentId: string, content: string) => void;
  onAddCounter: (argumentId: string, content: string) => void;
  onAddReply: (questionId: string, content: string) => void;
  onVoteArgument: (argumentId: string, value: number) => void;
  onVoteQuestion: (questionId: string, value: number) => void;
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
}: QuestionCardProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [draft, setDraft] = useState("");

  function handleSubmit() {
    const content = draft.trim();
    if (!content) return;
    onAddReply(question.id, content);
    setDraft("");
    setShowReplyForm(false);
  }

  const childProps = { isSignedIn, onAddQuestion, onAddSupport, onAddCounter, onAddReply, onVoteArgument, onVoteQuestion };

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
            <Badge color="purple" variant="soft" size="1" style={{ alignSelf: "flex-start" }}>
              Question
            </Badge>
            <Text size="2">{question.content}</Text>
            {isSignedIn && (
              <Button
                variant={showReplyForm ? "solid" : "outline"}
                color="gray"
                size="1"
                style={{ alignSelf: "flex-start" }}
                onClick={() => {
                  setShowReplyForm(!showReplyForm);
                  setDraft("");
                }}
              >
                Reply
                {question.replies.length > 0 && ` (${question.replies.length})`}
              </Button>
            )}
          </Flex>
        </Flex>
      </Card>

      {showReplyForm && (
        <Box pl="4">
          <Flex direction="column" gap="2">
            <TextArea
              size="2"
              placeholder="Write a reply..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) handleSubmit();
              }}
            />
            <Flex justify="end" gap="2">
              <Button
                variant="soft"
                color="gray"
                size="1"
                onClick={() => {
                  setShowReplyForm(false);
                  setDraft("");
                }}
              >
                Cancel
              </Button>
              <Button size="1" onClick={handleSubmit} disabled={!draft.trim()}>
                Reply
              </Button>
            </Flex>
          </Flex>
        </Box>
      )}

      {question.replies.length > 0 && (
        <Box pl="4" style={{ borderLeft: "2px solid var(--cyan-6)" }}>
          <Flex direction="column" gap="2">
            {question.replies.map((r) => (
              <ArgumentCard key={r.id} argument={r} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}
