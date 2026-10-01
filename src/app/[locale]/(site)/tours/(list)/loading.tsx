import { Container } from "@/components/layout/container";

export default function Loading() {
  return (
    <>
      <div className="border-line bg-sand-100 h-80 animate-pulse border-b md:h-96" />
      <Container className="grid gap-8 py-16 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-4">
            <div className="bg-sand-200 aspect-[4/5] animate-pulse rounded-(--radius-card)" />
            <div className="bg-sand-200 h-4 w-1/3 animate-pulse rounded" />
            <div className="bg-sand-200 h-6 w-3/4 animate-pulse rounded" />
          </div>
        ))}
      </Container>
    </>
  );
}
