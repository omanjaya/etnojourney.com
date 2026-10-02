"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form-controls";
import type { UserRole } from "@/server/db/schema";
import { changeUserRoleAction } from "../actions";

const roles: UserRole[] = ["user", "staff", "admin"];

/** Role picker for the user detail page. The server enforces every rule. */
export function UserRoleControl({ userId, role }: { userId: string; role: UserRole }) {
  const t = useTranslations("adminUsers");
  const [value, setValue] = useState<UserRole>(role);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await changeUserRoleAction(userId, value);
      setMessage(
        result.ok
          ? { tone: "success", text: t("detail.roleSaved") }
          : { tone: "danger", text: result.error },
      );
      if (!result.ok) setValue(role);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label={t("detail.roleLabel")} htmlFor="user-role" className="sm:w-56">
          <Select
            id="user-role"
            value={value}
            disabled={pending}
            onChange={(event) => setValue(event.target.value as UserRole)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          type="button"
          variant="dark"
          className="h-12"
          loading={pending}
          disabled={value === role}
          onClick={save}
        >
          {t("detail.saveRole")}
        </Button>
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </div>
  );
}
