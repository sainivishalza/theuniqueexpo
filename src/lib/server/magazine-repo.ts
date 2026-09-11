import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseArray } from "@/lib/server/db-helpers";

export interface MagazineIssueInput {
  issueNumber: number;
  title: string;
  coverImage?: string;
  intro: string;
  blogPostIds: number[];
  status: "draft" | "published";
  publishDate: string;
}

function mapIssueRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    issueNumber: row.issue_number,
    title: row.title,
    coverImage: row.cover_image,
    intro: row.intro,
    blogPostIds: safeParseArray(row.blog_post_ids).map(Number),
    status: row.status as "draft" | "published",
    publishDate: row.publish_date,
    updatedAt: row.updated_at ? Math.floor(new Date(row.updated_at).getTime() / 1000) : 0,
  };
}

// List views only ever render the cover thumbnail, never re-submit it --
// point at the dedicated image endpoint instead, same reasoning as
// listExhibitions/listTeamMembers.
export async function listPublishedIssues() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, issue_number, title, intro, blog_post_ids, status, publish_date, updated_at,
            IF(LEFT(cover_image, 5) = 'data:', CONCAT('/api/magazine/', id, '/cover?v=', UNIX_TIMESTAMP(updated_at)), cover_image) AS cover_image
     FROM magazine_issues WHERE status = 'published' ORDER BY issue_number DESC`
  );
  return rows.map(mapIssueRow);
}

export async function listAllIssues() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, issue_number, title, intro, blog_post_ids, status, publish_date, updated_at,
            IF(LEFT(cover_image, 5) = 'data:', CONCAT('/api/magazine/', id, '/cover?v=', UNIX_TIMESTAMP(updated_at)), cover_image) AS cover_image
     FROM magazine_issues ORDER BY issue_number DESC`
  );
  return rows.map(mapIssueRow);
}

export async function getIssueByNumber(issueNumber: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM magazine_issues WHERE issue_number = ? AND status = 'published' LIMIT 1",
    [issueNumber]
  );
  const row = rows[0];
  return row ? mapIssueRow(row) : null;
}

export async function getIssueById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM magazine_issues WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  return row ? mapIssueRow(row) : null;
}

// Targeted lookup for the dedicated cover-image-serving route -- avoids
// pulling every other column just to read the (potentially large) value.
export async function getIssueCoverImageValue(id: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT cover_image FROM magazine_issues WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  return row ? row.cover_image : null;
}

// Resolves an issue's referenced blog posts into the lightweight fields a
// magazine listing/detail page actually renders (title/excerpt/cover/slug/
// category), preserving the admin-picked order, skipping any post that's
// since been deleted rather than failing the whole issue.
export async function getIssueArticles(blogPostIds: number[]) {
  if (blogPostIds.length === 0) return [];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, slug, title, excerpt, category, author_name, cover_image
     FROM blog_posts WHERE id IN (?)`,
    [blogPostIds]
  );
  const bySlugId = new Map(rows.map((r) => [String(r.id), r]));
  return blogPostIds
    .map((id) => bySlugId.get(String(id)))
    .filter((r): r is RowDataPacket => !!r)
    .map((r) => ({
      id: String(r.id),
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      category: r.category,
      authorName: r.author_name || "",
      coverImage: r.cover_image,
    }));
}

export async function createIssue(input: MagazineIssueInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO magazine_issues (issue_number, title, cover_image, intro, blog_post_ids, status, publish_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.issueNumber,
      input.title,
      input.coverImage || "",
      input.intro,
      JSON.stringify(input.blogPostIds || []),
      input.status,
      input.publishDate || null,
    ]
  );
  return result.insertId;
}

export async function updateIssue(id: number, input: MagazineIssueInput) {
  await pool.query(
    `UPDATE magazine_issues SET issue_number=?, title=?, cover_image=?, intro=?, blog_post_ids=?, status=?, publish_date=?
     WHERE id=?`,
    [
      input.issueNumber,
      input.title,
      input.coverImage || "",
      input.intro,
      JSON.stringify(input.blogPostIds || []),
      input.status,
      input.publishDate || null,
      id,
    ]
  );
}

export async function deleteIssue(id: number) {
  await pool.query("DELETE FROM magazine_issues WHERE id = ?", [id]);
}
