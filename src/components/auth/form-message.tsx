export function FormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p
        role="status"
        className="rounded-md bg-success/10 px-3 py-2 text-sm text-success"
      >
        {success}
      </p>
    );
  }
  return null;
}
