import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { toIsoTimestamp } from "@/lib/server/db-helpers";

export type BlogCategory = "life-in-china" | "relocation-tips" | "exhibition-reviews";

export interface BlogPostInput {
  slug: string;
  category: BlogCategory;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  authorName?: string;
  authorBio?: string;
  published: boolean;
}

function mapBlogPostRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    slug: row.slug,
    category: row.category as BlogCategory,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    coverImage: row.cover_image,
    authorName: row.author_name || "",
    authorBio: row.author_bio || "",
    published: !!row.published,
    publishedAt: row.published_at ? toIsoTimestamp(row.published_at) : null,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}

// Public listing -- published posts only, newest first, optionally
// filtered to one of the fixed categories used by the Blog nav dropdown.
export async function listPublishedPosts(category?: BlogCategory) {
  const params: unknown[] = [];
  let where = "WHERE published = TRUE";
  if (category) {
    where += " AND category = ?";
    params.push(category);
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM blog_posts ${where} ORDER BY published_at DESC`,
    params
  );
  return rows.map(mapBlogPostRow);
}

export async function getPublishedPostBySlug(slug: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM blog_posts WHERE slug = ? AND published = TRUE LIMIT 1",
    [slug]
  );
  const row = rows[0];
  return row ? mapBlogPostRow(row) : null;
}

// Admin listing -- every post, drafts included.
export async function listAllPosts() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM blog_posts ORDER BY created_at DESC");
  return rows.map(mapBlogPostRow);
}

export async function getPostById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM blog_posts WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  return row ? mapBlogPostRow(row) : null;
}

export async function createPost(input: BlogPostInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO blog_posts (slug, category, title, excerpt, content, cover_image, author_name, author_bio, published, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slug, input.category, input.title, input.excerpt, input.content, input.coverImage || "",
      input.authorName || "", input.authorBio || "", input.published, input.published ? new Date() : null,
    ]
  );
  return result.insertId;
}

export async function updatePost(id: number, input: BlogPostInput) {
  const existing = await getPostById(id);
  // Only stamp published_at the first time a post goes live -- re-saving
  // an already-published post (or a still-draft one) shouldn't bump it.
  const publishedAt = input.published && !existing?.publishedAt ? new Date() : undefined;
  await pool.query(
    `UPDATE blog_posts SET slug=?, category=?, title=?, excerpt=?, content=?, cover_image=?, author_name=?, author_bio=?, published=?${publishedAt ? ", published_at=?" : ""}
     WHERE id=?`,
    publishedAt
      ? [input.slug, input.category, input.title, input.excerpt, input.content, input.coverImage || "", input.authorName || "", input.authorBio || "", input.published, publishedAt, id]
      : [input.slug, input.category, input.title, input.excerpt, input.content, input.coverImage || "", input.authorName || "", input.authorBio || "", input.published, id]
  );
}

export async function deletePost(id: number) {
  await pool.query("DELETE FROM blog_posts WHERE id = ?", [id]);
}
