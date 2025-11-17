export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-3xl font-medium text-foreground mb-8 text-center" data-testid="text-empty-prompt">
        What are you working on?
      </h1>
    </div>
  );
}
