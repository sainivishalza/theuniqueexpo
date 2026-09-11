import { NextResponse } from "next/server";
import { getIssueByNumber, getIssueArticles } from "@/lib/server/magazine-repo";

// Dynamic segment is named "id" (not "issueNumber") to match the sibling
// [id]/cover route -- Next.js requires the same param name for every route
// at this path depth, or the whole server fails to start. The value here is
// still the issue's public-facing issue number, not its DB row id.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: issueNumber } = await params;
  const issue = await getIssueByNumber(Number(issueNumber));
  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  const articles = await getIssueArticles(issue.blogPostIds);
  return NextResponse.json({ issue, articles });
}
