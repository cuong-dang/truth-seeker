"use client";

import { useState } from "react";
import { Badge, Box, Button, Card, Flex, IconButton, Text, TextArea } from "@radix-ui/themes";
import { ThickArrowUpIcon, ThickArrowDownIcon } from "@radix-ui/react-icons";
import type { Argument, ArgumentKind } from "@/types/argument";
import QuestionCard from "./QuestionCard";

type FormType = "question" | "support" | "counter";

interface ArgumentCardProps {
  argument: Argument;
  isSignedIn: boolean;
  onAddQuestion: (argumentId: string, content: string) => void;
  onAddSupport: (argumentId: string, content: string) => void;
  onAddCounter: (argumentId: string, content: string) => void;
  onAddReply: (questionId: string, content: string) => void;
  onVoteArgument: (argumentId: string, value: number) => void;
  onVoteQuestion: (questionId: string, value: number) => void;
}

const kindBadge: Record<ArgumentKind, { label: string; color: "green" | "red" | "cyan" } | null> = {
  ROOT: null,
  SUPPORT: { label: "Supporting", color: "green" },
  COUNTER: { label: "Counter", color: "red" },
  REPLY: { label: "Reply", color: "cyan" },
};

const formPlaceholders: Record<FormType, string> = {
  question: "Ask a question...",
  support: "Write a supporting argument...",
  counter: "Write a counter-argument...",
};

export default function ArgumentCard({
  argument,
  isSignedIn,
  onAddQuestion,
  onAddSupport,
  onAddCounter,
  onAddReply,
  onVoteArgument,
  onVoteQuestion,
}: ArgumentCardProps) {
  const [activeForm, setActiveForm] = useState<FormType | null>(null);
  const [draft, setDraft] = useState("");

  function handleSubmit() {
    const content = draft.trim();
    if (!content || !activeForm) return;

    if (activeForm === "question") onAddQuestion(argument.id, content);
    else if (activeForm === "support") onAddSupport(argument.id, content);
    else if (activeForm === "counter") onAddCounter(argument.id, content);

    setDraft("");
    setActiveForm(null);
  }

  function toggleForm(type: FormType) {
    setActiveForm(activeForm === type ? null : type);
    setDraft("");
  }

  const badge = kindBadge[argument.kind];
  const childProps = { isSignedIn, onAddQuestion, onAddSupport, onAddCounter, onAddReply, onVoteArgument, onVoteQuestion };

  return (
    <Flex direction="column" gap="3">
      <Card>
        <Flex gap="3">
          {isSignedIn && (
            <Flex direction="column" align="center" gap="0" style={{ minWidth: 32 }}>
              <IconButton
                size="1"
                variant={argument.userVote === 1 ? "solid" : "ghost"}
                color="green"
                onClick={() => onVoteArgument(argument.id, 1)}
              >
                <ThickArrowUpIcon />
              </IconButton>
              <Text size="2" weight="medium" color={argument.score > 0 ? "green" : argument.score < 0 ? "red" : "gray"}>
                {argument.score}
              </Text>
              <IconButton
                size="1"
                variant={argument.userVote === -1 ? "solid" : "ghost"}
                color="red"
                onClick={() => onVoteArgument(argument.id, -1)}
              >
                <ThickArrowDownIcon />
              </IconButton>
            </Flex>
          )}
          <Flex direction="column" gap="3" flexGrow="1">
            {badge && (
              <Badge color={badge.color} variant="soft" size="1" style={{ alignSelf: "flex-start" }}>
                {badge.label}
              </Badge>
            )}
            <Text size="3">{argument.content}</Text>
            {isSignedIn && (
              <Flex gap="2">
                <Button
                  variant={activeForm === "question" ? "solid" : "outline"}
                  color="blue"
                  size="2"
                  onClick={() => toggleForm("question")}
                >
                  Question
                  {argument.questions.length > 0 && ` (${argument.questions.length})`}
                </Button>
                <Button
                  variant={activeForm === "support" ? "solid" : "outline"}
                  color="green"
                  size="2"
                  onClick={() => toggleForm("support")}
                >
                  Support
                  {argument.supports.length > 0 && ` (${argument.supports.length})`}
                </Button>
                <Button
                  variant={activeForm === "counter" ? "solid" : "outline"}
                  color="red"
                  size="2"
                  onClick={() => toggleForm("counter")}
                >
                  Counter
                  {argument.counters.length > 0 && ` (${argument.counters.length})`}
                </Button>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Card>

      {activeForm && (
        <Box pl="4">
          <Flex direction="column" gap="2">
            <TextArea
              size="2"
              placeholder={formPlaceholders[activeForm]}
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
                  setActiveForm(null);
                  setDraft("");
                }}
              >
                Cancel
              </Button>
              <Button size="1" onClick={handleSubmit} disabled={!draft.trim()}>
                Submit
              </Button>
            </Flex>
          </Flex>
        </Box>
      )}

      {argument.questions.length > 0 && (
        <Box pl="4" style={{ borderLeft: "2px solid var(--purple-6)" }}>
          <Flex direction="column" gap="2">
            {argument.questions.map((q) => (
              <QuestionCard key={q.id} question={q} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}

      {argument.supports.length > 0 && (
        <Box pl="4" style={{ borderLeft: "2px solid var(--green-6)" }}>
          <Flex direction="column" gap="2">
            {argument.supports.map((s) => (
              <ArgumentCard key={s.id} argument={s} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}

      {argument.counters.length > 0 && (
        <Box pl="4" style={{ borderLeft: "2px solid var(--red-6)" }}>
          <Flex direction="column" gap="2">
            {argument.counters.map((c) => (
              <ArgumentCard key={c.id} argument={c} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}
