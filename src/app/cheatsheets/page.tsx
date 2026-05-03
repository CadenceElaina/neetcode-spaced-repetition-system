import { CHEATSHEETS } from "@/lib/cheatsheets";
import { CheatsheetClient } from "./cheatsheets-client";

export const metadata = { title: "Cheatsheets — Aurora" };

export default function CheatsheetPage() {
  return <CheatsheetClient sheets={CHEATSHEETS} />;
}
