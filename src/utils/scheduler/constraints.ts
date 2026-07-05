import { FixedBlock } from "../../types";
import { timeToMinutes } from "./timeUtils";

export function isFixedBlockActiveOnDate(block: FixedBlock, dateStr: string): boolean {
  if (block.repeats === "daily") return true;
  
  const [year, month, day] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  if (block.repeats === "weekdays") {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  
  if (block.repeats === "custom") {
    return !!block.daysOfWeek?.includes(dayOfWeek);
  }
  
  if (block.repeats === "none") {
    return block.date === dateStr;
  }
  
  return false;
}

// Map energy level to priority (higher matches morning gaps better)
