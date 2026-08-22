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
  imageUrl,
  icon,
  size = "md",
  className,
  title,
}: {
  firstName: string;
  lastName: string;
  color?: string;
  imageUrl?: string | null;
  icon?: string | null;
  size?: AvatarSize;
  className?: string;
  title?: string;
}) {
  const label = title ?? `${firstName} ${lastName}`;
  return (
    <span
      title={title}
      aria-label={label}
      style={{ backgroundColor: color ?? "#6366f1" }}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        sizeClasses[size],
        className,
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={label} className="size-full object-cover" />
      ) : icon ? (
        <span aria-hidden className="text-[1.35em] leading-none">
          {icon}
        </span>
      ) : (
        initials(firstName, lastName)
      )}
    </span>
  );
}

/** Stacked row of avatars with +N overflow. */
export function AvatarStack({
  users,
  max = 4,
  size = "sm",
}: {
  users: {
    id: string;
    firstName: string;
    lastName: string;
    avatarColor: string;
    avatarImage?: string | null;
    avatarIcon?: string | null;
  }[];
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
          imageUrl={u.avatarImage}
          icon={u.avatarIcon}
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
