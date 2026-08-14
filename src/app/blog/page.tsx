import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/blog/blog-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { BLOG_POSTS, readingMinutes } from "@/lib/blog/posts";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Blog — guías de invitaciones digitales",
  description:
    "Guías y consejos para crear invitaciones digitales: bodas, XV años, cumpleaños y más. Aprende a diseñarlas, redactarlas y compartirlas.",
  alternates: { canonical: "/blog" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog de Sobrely",
    url: `${SITE_URL}/blog`,
    inLanguage: "es-MX",
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      url: `${SITE_URL}/blog/${p.slug}`,
    })),
  };

  return (
    <BlogShell>
      <JsonLd data={blogLd} />
      <section className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold tracking-tight">Blog</h1>
        <p className="mt-3 text-muted-foreground">
          Guías y consejos para crear tus invitaciones digitales.
        </p>

        <ul className="mt-10 space-y-8">
          {posts.map((p) => (
            <li key={p.slug} className="border-b border-border pb-8">
              <Link href={`/blog/${p.slug}`} className="group">
                <h2 className="font-display text-2xl font-bold tracking-tight group-hover:text-brand-gold-deep">
                  {p.title}
                </h2>
              </Link>
              <p className="mt-2 text-muted-foreground">{p.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDate(p.date)} · {readingMinutes(p)} min de lectura
              </p>
            </li>
          ))}
        </ul>
      </section>
    </BlogShell>
  );
}
