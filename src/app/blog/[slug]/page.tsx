import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogShell } from "@/components/blog/blog-shell";
import { PostBody } from "@/components/blog/post-body";
import { JsonLd } from "@/components/seo/json-ld";
import { BLOG_POSTS, getBlogPost, readingMinutes } from "@/lib/blog/posts";
import { EVENT_LANDINGS } from "@/lib/seo/event-landings";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Artículo no encontrado" };
  return {
    title: { absolute: `${post.title} | Sobrely` },
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "es-MX",
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "Sobrely" },
    publisher: {
      "@type": "Organization",
      name: "Sobrely",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/sobrely-logo-horizontal.png`,
      },
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const related = (post.related ?? [])
    .map((s) => Object.values(EVENT_LANDINGS).find((e) => e.slug === s))
    .filter((e): e is (typeof EVENT_LANDINGS)[string] => Boolean(e));

  return (
    <BlogShell>
      <JsonLd data={[articleLd, breadcrumbLd]} />
      <article className="mx-auto w-full max-w-2xl px-4 py-12">
        <nav className="text-sm text-muted-foreground">
          <Link href="/blog" className="hover:text-foreground">
            ← Blog
          </Link>
        </nav>

        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-balance">
          {post.title}
        </h1>
        <p className="mt-3 text-xs text-muted-foreground">
          {formatDate(post.date)} · {readingMinutes(post)} min de lectura
        </p>

        <div className="mt-8">
          <PostBody blocks={post.body} />
        </div>

        {related.length > 0 && (
          <div className="mt-12 rounded-xl border border-border p-5">
            <p className="font-semibold">Sigue leyendo</p>
            <ul className="mt-3 space-y-2">
              {related.map((e) => (
                <li key={e.slug}>
                  <Link
                    href={`/${e.slug}`}
                    className="text-brand-gold-deep hover:underline"
                  >
                    {e.eyebrow} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 rounded-xl border border-border p-6 text-center">
          <p className="font-display text-xl font-bold">
            Crea tu invitación digital hoy
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Empieza gratis y publica cuando estés listo. Sin suscripción.
          </p>
          <div className="mt-4">
            <Link
              href="/register"
              className="inline-flex rounded-md bg-brand-gold px-5 py-2.5 text-sm font-medium text-brand-ink hover:bg-brand-gold-deep hover:text-white"
            >
              Empieza gratis
            </Link>
          </div>
        </div>
      </article>
    </BlogShell>
  );
}
