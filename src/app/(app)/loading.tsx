import { Skeleton } from "@/components/ui/input";

export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
