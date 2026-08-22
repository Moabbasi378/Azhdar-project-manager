import { cn, initials } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
};

export function Avatar({
  firstName,
  lastName,
  color,
  size = "md",
  className,
  title,
}: {
  firstName: string;
  lastName: string;
  color?: string;
  size?: AvatarSize;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      aria-label={title ?? `${firstName} ${lastName}`}
      style={{ backgroundColor: color ?? "#6366f1" }}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
        sizeClasses[size],
        className,
      )}
    >
      {initials(firstName, lastName)}
    </span>
  );
}

/** Stacked row of avatars with +N overflow. */
export function AvatarStack({
  users,
  max = 4,
  size = "sm",
}: {
  users: { id: string; firstName: string; lastName: string; avatarColor: string }[];
  max?: number;
  size?: AvatarSize;
}) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <div className="flex items-center [&>*+*]:-ms-1.5">
      {shown.map((u) => (
        <Avatar
          key={u.id}
          firstName={u.firstName}
          lastName={u.lastName}
          color={u.avatarColor}
          size={size}
          title={`${u.firstName} ${u.lastName}`}
          className="ring-2 ring-card"
        />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-secondary text-muted-foreground ring-2 ring-card",
            sizeClasses[size],
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
