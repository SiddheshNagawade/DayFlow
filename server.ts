import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini client to handle missing API keys gracefully on startup
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please add it in the Secrets manager in Google AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Health check routing
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Schedule Parsing API (Section 4 of Spec)
app.post("/api/parse-schedule", async (req, res) => {
  try {
    const { text, currentDate } = req.body;
    if (!text || typeof text !== "string" || text.trim() === "") {
       res.status(400).json({ error: "Text prompt is required" });
       return;
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are a scheduling parser.
Extract tasks from the user's text description.
Classify each item as either:
- "fixed" (has a specific time mentioned, e.g. "gym at 4 for 3 hours", "meeting at 10 AM", "sleep by 11pm")
- "flexible" (does not have a specific start time, just needs some duration or a deadline, or is a flexible task like "study for 2 hours", "finish assignment", "call mom")

For fixed items extract:
- title: string
- start: string (time in 24-hour HH:MM format, e.g. "16:00", "23:00", "09:30")
- end: string (time in 24-hour HH:MM format if mentioned or calculated from duration, otherwise estimate reasonably. End time MUST be greater than the start time. Format "HH:MM")

For flexible items extract:
- title: string
- duration: number (estimated duration in minutes. If they say "2 hours", it is 120. If they don't mention a duration, estimate a reasonable amount, e.g., 30 for call, 60 for study.)
- deadline: string or null (YYYY-MM-DD deadline format if Friday/Monday or specific day is mentioned in reference to today's date ${currentDate || '2026-06-13'}, otherwise null).

Never guess a start time for flexible tasks. Please output correct JSON structure conforming exactly to the schema. Respond ONLY with a raw, valid JSON object. Do not include markdown code block characters, notes, formatting tags, or preambles.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Current Date is: ${currentDate || '2026-06-13'}. User input schedule is:\n"${text}"`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1, // very low temperature for strict compliance
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fixed: {
              type: Type.ARRAY,
              description: "Extracted fixed-time blocks",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  start: { type: Type.STRING, description: "Start time in HH:MM format" },
                  end: { type: Type.STRING, description: "End time in HH:MM format" },
                },
                required: ["title", "start", "end"],
              },
            },
            flexible: {
              type: Type.ARRAY,
              description: "Extracted flexible tasks with duration and deadlines",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  duration: { type: Type.INTEGER, description: "Estimated duration in minutes" },
                  deadline: { type: Type.STRING, description: "Optional deadline date YYYY-MM-DD or null" },
                },
                required: ["title", "duration"],
              },
            },
          },
          required: ["fixed", "flexible"],
        },
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Empty response received from parser model");
    }

    const result = JSON.parse(outputText.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Schedule Parse Error: ", error);
    res.status(500).json({ error: error.message || "An error occurred while parsing your schedule with Gemini." });
  }
});

// 3. Schedule Adjustment API — user describes changes in plain text, AI returns structured modifications
app.post("/api/adjust-schedule", async (req, res) => {
  try {
    const { userText, currentSchedule, pendingTasks, today } = req.body;
    if (!userText || typeof userText !== "string" || userText.trim() === "") {
      res.status(400).json({ error: "Change description is required" });
      return;
    }

    const ai = getGeminiClient();

    const scheduleContext = (currentSchedule || [])
      .map((item: any) => `- "${item.title}" [${item.type}] ${item.start_time}–${item.end_time} id="${item.id}"`)
      .join("\n");
    
    const pendingContext = (pendingTasks || [])
      .map((t: any) => `- "${t.title}" (${t.duration_minutes}min) id="${t.id}" scheduled="${t.scheduled_date || 'backlog'}"`)
      .join("\n");

    const systemPrompt = `You are a personal schedule adjustment assistant and productivity coach for the DayFlow app.
The user describes their situation, adjustments they want to make, or their current mood and feelings in plain English.
Today's Date is: ${today}.

Current schedule for today:
${scheduleContext || "(empty)"}

Pending flexible tasks (backlog):
${pendingContext || "(none)"}

Based on the user's input, return a response matching the JSON structure blueprint below.

### JSON STRUCTURE BLUEPRINT:
Your response must conform exactly to this structure. Return only keys from this template:
{
  "changes": [
    {
      "action": "delete" | "move_to_tomorrow" | "move_to_date" | "change_time" | "reduce_duration" | "add" | "cant_do_today" | "add_goal" | "update_goal",
      "taskId": "string representing the task/goal ID to modify (empty/omit for add/add_goal)",
      "newDate": "YYYY-MM-DD (used only for move_to_date)",
      "newTime": "HH:MM (used for change_time to schedule/pin at specific time)",
      "durationMultiplier": 0.5, // number (used only for reduce_duration to scale length, e.g. 0.5)
      "newTaskTitle": "string (used only for action=add)",
      "newTaskDuration": 30, // integer minutes (used only for action=add)
      "insertImmediately": true | false, // boolean (used when action=add or action=change_time to pin/start a task/break immediately at the current time without doing calendar time math)
      "goalTitle": "string (used to set/find a goal for add_goal or update_goal)",
      "goalCategory": "fitness" | "academic" | "project" | "habit" | "personal",
      "goalMetric": "string (e.g., 'sessions', 'hours', 'pages')",
      "goalTarget": 10, // integer (new target count for add_goal or update_goal)
      "goalKeywords": ["keyword1", "keyword2"], // array of keywords to auto-match task titles
      "reasoning": "Brief explanation for the change"
    }
  ],
  "message": "A supportive, conversational explanation of the changes"
}

### TIME CALCULATION RULE (AVOID HALLUCINATION):
- DO NOT calculate start/end clock hours or absolute times yourself (e.g. do not calculate that 3:15 PM + 45 minutes = 4:00 PM).
- For relative placements like "add a break now", "give me a rest immediately", or "do this task right now", set "insertImmediately": true on the action ("add" or "change_time") instead of guessing/calculating "newTime".

### ACTION RULES:
- "add": Propose adding a task (e.g. a rest block like title "Rest / Break" with duration 30 and "insertImmediately": true, or a new backlog item).
- "delete": Remove task by taskId.
- "move_to_tomorrow": Move task by taskId to tomorrow.
- "change_time": Shift task by taskId to start at "newTime" (absolute) or right now ("insertImmediately": true).
- "reduce_duration": Shorten task duration using "durationMultiplier".
- "add_goal": Create a new goal.
- "update_goal": Change target/parameters of an existing goal when user requests it (e.g., "increase workout target to 15 sessions"). Specify the goal by matching "taskId" (goal id) or "goalTitle" (goal name), and specify the new target in "goalTarget".

TREAT SUBJECTIVE INPUTS/MOODS GRACEFULLY:
- If the user says they are "tired" or "feeling lazy":
  - Express empathy and recommend a lighter schedule.
  - Propose moving demanding/optional tasks to tomorrow or the backlog (using action "move_to_tomorrow" or "delete").
  - Propose shortening remaining tasks (using action "reduce_duration" with a durationMultiplier e.g., 0.5).
  - Propose adding a rest/break block (using action "add" with title "Rest / Break", "insertImmediately": true, and "newTaskDuration": 30).
- If the user says they are "feeling very productive" or "energetic":
  - Celebrate their energy and suggest capitalizing on it.
  - Propose scheduling 1 or 2 pending tasks from the backlog (using action "add" with the backlog task's title and duration).

PROACTIVE GOAL SETUP & TRACKING:
- Proactively offer to set up a new tracking goal or streak (using action "add_goal") in the changes list if the user:
  - Asks to set a goal or a streak (e.g., "set a gym workout goal for 10 sessions" or "track my study routine").
  - Schedules a new recurring block or routine (e.g. gym/exercise, study sessions, reading, projects) that doesn't have a goal yet.
  - For example, if a user schedules "gym", suggest creating a Fitness Goal of e.g. 20 sessions, and define keywords like ["gym", "workout"].
- Mention the proposed goal or update in your message.

Be concise, warm, non-judgmental, and focused on helping the user stay productive without burning out.
Avoid aggressive exclamation marks and do not issue scary warnings. Respond ONLY with a raw, valid JSON object. Do not include markdown code block characters, notes, formatting tags, or preambles.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `User's change request: "${userText}"`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            changes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING, description: "One of: delete, move_to_tomorrow, move_to_date, change_time, reduce_duration, add, cant_do_today, add_goal, update_goal" },
                  taskId: { type: Type.STRING, description: "Task or goal id to modify (empty for add/add_goal)" },
                  newDate: { type: Type.STRING, description: "YYYY-MM-DD for move_to_date" },
                  newTime: { type: Type.STRING, description: "HH:MM for change_time" },
                  durationMultiplier: { type: Type.NUMBER, description: "e.g. 0.5 to scale duration for reduce_duration" },
                  newTaskTitle: { type: Type.STRING, description: "Title for new task when action=add" },
                  newTaskDuration: { type: Type.INTEGER, description: "Minutes for new task when action=add" },
                  insertImmediately: { type: Type.BOOLEAN, description: "Set to true if the task/break must start right now, avoiding time calculations" },
                  goalTitle: { type: Type.STRING, description: "Title of the goal if action=add_goal or update_goal" },
                  goalCategory: { type: Type.STRING, description: "fitness, academic, project, habit, personal if action=add_goal" },
                  goalMetric: { type: Type.STRING, description: "Metric e.g. sessions, hours, pages if action=add_goal" },
                  goalTarget: { type: Type.INTEGER, description: "Target count if action=add_goal or update_goal" },
                  goalKeywords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Keywords to auto-match task titles, e.g. ['gym', 'workout'] if action=add_goal"
                  },
                  reasoning: { type: Type.STRING },
                },
                required: ["action", "reasoning"],
              },
            },
            message: { type: Type.STRING, description: "A short friendly summary of all changes made and any suggested goals" },
          },
          required: ["changes", "message"],
        },
      },
    });

    const outputText = response.text;
    if (!outputText) throw new Error("Empty response from model");
    const result = JSON.parse(outputText.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Schedule Adjust Error:", error);
    res.status(500).json({ error: error.message || "Failed to process schedule changes." });
  }
});



// Vite middleware / client routing setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running and listening on http://localhost:${PORT}`);
  });
}

startServer();
