"use client";

import { MessageSquareReply, Pencil, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { REVIEW_REPLY_MAX } from "@/server/services/review.rules";
import { removeReviewReplyAction, saveReviewReplyAction } from "../actions";

type Mode = "view" | "edit" | "confirmRemove";

/** Admin: add, edit or remove the team's public reply under one review. */
export function ReviewReplyEditor({
  reviewId,
  author,
  initialReply,
  initialRepliedAt,
}: {
  reviewId: number;
  author: string;
  initialReply: string | null;
  /** ISO timestamp. */
  initialRepliedAt: string | null;
}) {
  const t = useTranslations("adminInsights.reply");
  const format = useFormatter();
  const id = useId();
  const [reply, setReply] = useState(initialReply);
  const [repliedAt, setRepliedAt] = useState(initialRepliedAt);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState(initialReply ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  // Set when the visitor switches mode, so focus follows them (not on first render).
  const moved = useRef(false);

  // Keep keyboard focus where the visitor is working: into the textarea when
  // editing, onto the first action (confirm / add / edit) otherwise.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const root = rootRef.current;
    const target =
      mode === "edit"
        ? root?.querySelector("textarea")
        : mode === "confirmRemove"
          ? // The safe choice (cancel) first, so a stray Enter doesn't delete.
            root?.querySelector<HTMLButtonElement>('[role="group"] button:last-of-type')
          : root?.querySelector("button");
    target?.focus();
  }, [mode, reply]);

  const switchTo = (next: Mode) => {
    moved.current = true;
    setMode(next);
  };

  const textareaId = `${id}-reply`;
  const errorId = `${textareaId}-error`;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveReviewReplyAction(reviewId, draft);
      if (!result.ok) {
        setError(result.fieldErrors?.reply?.[0] ?? result.error);
        return;
      }
      setReply(result.data.reply);
      setRepliedAt(result.data.repliedAt);
      switchTo("view");
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeReviewReplyAction(reviewId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReply(null);
      setRepliedAt(null);
      setDraft("");
      switchTo("view");
    });
  };

  if (mode === "edit") {
    return (
      <div ref={rootRef} className="mt-3 flex flex-col gap-2">
        <label htmlFor={textareaId} className="text-ink-soft text-xs font-medium">
          {t("fieldLabel", { author })}
        </label>
        <Textarea
          id={textareaId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={REVIEW_REPLY_MAX}
          rows={4}
          placeholder={t("placeholder")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-24 text-sm"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted text-xs tabular-nums">
            {t("counter", { count: draft.trim().length, max: REVIEW_REPLY_MAX })}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(reply ?? "");
                setError(null);
                switchTo("view");
              }}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="button" variant="dark" size="sm" onClick={save} disabled={pending}>
              {t("save")}
            </Button>
          </div>
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-danger text-xs">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (!reply) {
    return (
      <div ref={rootRef} className="mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => switchTo("edit")}
          aria-label={t("addFor", { author })}
        >
          <MessageSquareReply aria-hidden />
          {t("add")}
        </Button>
        {error && (
          <p role="alert" className="text-danger mt-2 text-xs">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="border-terracotta/40 bg-sand-50 mt-3 rounded-xl border-l-2 px-3 py-2"
    >
      <p className="text-ink-soft text-xs font-medium">
        {t("existing")}
        {repliedAt && (
          <span className="text-muted font-normal">
            {" "}
            &middot; {format.dateTime(new Date(repliedAt), { dateStyle: "medium" })}
          </span>
        )}
      </p>
      <p className="text-ink-soft mt-1 line-clamp-4 text-sm leading-relaxed whitespace-pre-line">
        {reply}
      </p>
      {mode === "confirmRemove" ? (
        <div className="mt-2 flex flex-wrap items-center gap-2" role="group">
          <span className="text-xs">{t("confirmRemove")}</span>
          <Button type="button" variant="danger" size="sm" onClick={remove} disabled={pending}>
            {t("removeConfirm")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => switchTo("view")}
            disabled={pending}
          >
            {t("cancel")}
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(reply);
              switchTo("edit");
            }}
            aria-label={t("editFor", { author })}
          >
            <Pencil aria-hidden />
            {t("edit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => switchTo("confirmRemove")}
            aria-label={t("removeFor", { author })}
          >
            <Trash2 aria-hidden />
            {t("remove")}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-danger mt-2 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
