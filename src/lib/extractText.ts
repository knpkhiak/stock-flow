// Extract plain text from a TipTap JSON document
export function extractTextFromJSON(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  let text = "";
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node.text === "string") text += node.text + " ";
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(content);
  return text.replace(/\s+/g, " ").trim();
}
