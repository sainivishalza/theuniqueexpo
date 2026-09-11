import { NextResponse } from "next/server";
import { getIssueByNumber, getIssueArticles } from "@/lib/server/magazine-repo";

export async function GET(request: Request, { params }: { params: Promise<{ issueNumber: string }> }) {
  const { issueNumber } = await params;
  const issue = await getIssueByNumber(Number(issueNumber));
  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  const articles = await getIssueArticles(issue.blogPostIds);
  return NextResponse.json({ issue, articles });
}
