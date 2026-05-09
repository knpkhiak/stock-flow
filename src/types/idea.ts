export type IdeaStatus = "watching" | "entered" | "passed";

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  ticker: string | null;
  market: string | null;
  content: any;
  tags: string[];
  status: IdeaStatus;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<IdeaStatus, string> = {
  watching: "대기중",
  entered: "진입함",
  passed: "패스",
};
