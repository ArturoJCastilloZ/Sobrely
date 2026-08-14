import type { BlogBlock } from "@/lib/blog/posts";

/** Renderiza el cuerpo de un post (bloques simples). Solo texto, sin HTML. */
export function PostBody({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        if (b.type === "h2") {
          return (
            <h2
              key={i}
              className="font-display text-2xl font-bold tracking-tight"
            >
              {b.text}
            </h2>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-2 pl-6 text-muted-foreground">
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-muted-foreground">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}
