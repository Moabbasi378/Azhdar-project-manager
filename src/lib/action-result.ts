import { Prisma } from "@/generated/prisma/client";
import { PermissionError } from "@/lib/permissions";

/** Result type returned by every server action. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const PRISMA_ERRORS: Record<string, string> = {
  P2002: "این مقدار قبلاً ثبت شده است (مقدار تکراری)",
  P2025: "رکورد مورد نظر یافت نشد",
  P2003: "این رکورد به داده‌های دیگر وابسته است",
};

/** Throw for expected, user-facing failures; the message is shown as-is. */
export class UserError extends Error {}

const CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: "مورد مورد نظر یافت نشد.",
  WRONG_PASSWORD: "رمز فعلی اشتباه است.",
  OWNER_REMOVE: "مالک پروژه قابل حذف نیست.",
  LAST_STATUS: "حداقل یک وضعیت باید باقی بماند.",
};

export function toPersianError(err: unknown): string {
  if (err instanceof PermissionError) return "شما اجازه انجام این کار را ندارید.";
  if (err instanceof UserError) return err.message;
  if (err instanceof Error) {
    if (CODE_MESSAGES[err.message]) return CODE_MESSAGES[err.message];
    if (err.message === "UNAUTHENTICATED") return "ابتدا وارد شوید.";
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return PRISMA_ERRORS[err.code] ?? "خطای پایگاه داده رخ داد.";
    }
    if (err.message.startsWith("orderBetween")) return "ترتیب نامعتبر است.";
  }
  return "خطایی غیرمنتظره رخ داد. دوباره تلاش کنید.";
}

/** Wrap a server action body so it always returns a serializable result. */
export async function action<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (
      !(err instanceof PermissionError) &&
      !(err instanceof UserError) &&
      !(err instanceof Prisma.PrismaClientKnownRequestError)
    ) {
      console.error("[action]", err);
    }
    return { ok: false, error: toPersianError(err) };
  }
}
