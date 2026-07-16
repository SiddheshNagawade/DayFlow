import express from "express";
import net from "net";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JSON_BODY_LIMIT = "10mb";

async function findAvailablePort(startPort: number): Promise<number> {
  const isPortAvailable = (port: number) =>
    new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on("error", () => resolve(false));
      server.listen({ port, host: "0.0.0.0" }, () => {
        server.close(() => resolve(true));
      });
    });

  let candidate = startPort;
  while (candidate < startPort + 20) {
    // In development we prefer a running app over a hard crash.
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
    candidate += 1;
  }

  return startPort;
}

app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

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

function handleApiError(res: express.Response, error: any, defaultMsg: string) {
  const statusCode = error.status || 500;
  let clientMessage = error.message || defaultMsg;
  try {
    if (typeof clientMessage === "string" && clientMessage.trim().startsWith("{")) {
      const parsed = JSON.parse(clientMessage);
      if (parsed.error && parsed.error.message) {
        clientMessage = parsed.error.message;
      }
    }
  } catch (_) {}
  res.status(statusCode).json({ error: clientMessage });
}

// 1. Health check routing
app.get("/api/health", (req, res) => {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  res.json({ 
    status: "ok", 
    geminiApiKeyConfigured: hasApiKey, 
    time: new Date().toISOString() 
  });
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
      model: "gemini-2.5-flash",
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
    handleApiError(res, error, "An error occurred while parsing your schedule with Gemini.");
  }
});

// 2.1. Lightweight Semantic Parser fallback (Tier 2B - Temporary fallback, targeted for deprecation in v2)
app.post("/api/parse-command", async (req, res) => {
  try {
    const { message, activeTasks, currentTime } = req.body;
    if (!message || typeof message !== "string" || message.trim() === "") {
      res.status(400).json({ error: "message prompt is required" });
      return;
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are a lightweight semantic command parser for the DayFlow scheduling app.
Your job is to analyze the user's messy command and map it to a structured action.
Today's currentTime is ${currentTime || "09:00"}.

Active tasks on today's schedule:
${(activeTasks || []).map((t: any) => `- "${t.title}" id="${t.id}" start_time="${t.start_time || ''}"`).join("\n") || "(none)"}

Actions you can map to:
1. "change_time": Schedule/move a task to a specific start time (requires "newTime" in HH:MM format).
2. "delete": Delete or remove a task.
3. "move_to_tomorrow": Postpone or shift a task to tomorrow.
4. "add": Add a new task (requires "newTaskTitle" and optionally "durationMinutes").
5. "done": Mark a task complete.
6. "delay": Postpone a task by a duration (requires "delayMinutes").
7. "unknown": The message is highly ambiguous (e.g., "I don't think I can finish this before dinner") or requires scheduling reasoning (e.g., "replan my day").

Instructions:
- If the user refers to a task in the active list (e.g. "done gym", "move study"), match it and set its taskId.
- If it's ambiguous (e.g., "move that thing later" when multiple tasks exist), map intent to "unknown" and list the candidate tasks in "options".
- Keep it extremely fast and return ONLY the JSON representation conforming exactly to the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `User message command: "${message}"`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { type: Type.STRING, enum: ["change_time", "delete", "move_to_tomorrow", "add", "done", "delay", "unknown"] },
            taskId: { type: Type.STRING, description: "Matched active task ID or null" },
            taskTitle: { type: Type.STRING, description: "Matched active task title or null" },
            confidence: { type: Type.NUMBER, description: "Confidence score 0.0 to 1.0" },
            parameters: {
              type: Type.OBJECT,
              properties: {
                newTime: { type: Type.STRING, description: "HH:MM start time" },
                delayMinutes: { type: Type.INTEGER, description: "Minutes to delay" },
                newTaskTitle: { type: Type.STRING, description: "Title of task to add" },
                durationMinutes: { type: Type.INTEGER, description: "Duration in minutes" }
              }
            },
            options: {
              type: Type.ARRAY,
              description: "List of task options if user referred to something ambiguous",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING }
                },
                required: ["id", "title"]
              }
            }
          },
          required: ["intent", "confidence"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from command parser");
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Parse command error:", error);
    handleApiError(res, error, "Failed to parse command.");
  }
});

// 2.2. Schedule Optimization API (Tier 3)
app.post(["/api/schedule", "/api/adjust-schedule"], async (req, res) => {
  try {
    const { userText, currentSchedule, pendingTasks, behaviorSignals, schedulerMath, today } = req.body;
    const ai = getGeminiClient();

    const scheduleContext = (currentSchedule || [])
      .map((item: any) => `- "${item.title}" [${item.type}] ${item.start_time}–${item.end_time} id="${item.id}" status="${item.status}"`)
      .join("\n");

    const pendingContext = (pendingTasks || [])
      .slice(0, 10)
      .map((t: any) => `- "${t.title}" (${t.duration_minutes}min) id="${t.id}" scheduled="${t.scheduled_date || 'backlog'}"`)
      .join("\n");

    const systemPrompt = `You are the Schedule Optimization Brain for the DayFlow app.
Your job is to optimize the user's schedule, resolve overload, handle emotional paralysis, and explain your changes.
Do NOT perform deadline or scheduling math yourself. Rely strictly on the pre-calculated schedulerMath provided by the frontend:
${JSON.stringify(schedulerMath || {})}

Today's date is: ${today}.
Current schedule:
${scheduleContext || "(none)"}
Pending backlog:
${pendingContext || "(none)"}
Behavior Signals (avoidance/delay statistics):
${JSON.stringify(behaviorSignals || {})}

Core Coaching Philosophy:
Optimize for momentum and avoidance reduction. If a user is avoiding specific tasks (e.g. portfolio work shows repeated avoidance), prioritize breaking down the task, reducing its scope, or placing it during peak focus slots.

Provide your output as a JSON object containing a conversational message and a structured "schedule_proposal" card.
Your response must contain exactly:
{
  "message": "Conversational coach feedback explaining the changes.",
  "card": {
    "type": "schedule_proposal",
    "payload": {
      "changes": [
        {
          "action": "delete" | "move_to_tomorrow" | "change_time" | "reduce_duration" | "add" | "mark_important",
          "taskId": "task ID to modify (empty/omit for add)",
          "newTime": "HH:MM (for change_time)",
          "durationMinutes": 60,
          "newTaskTitle": "title for add",
          "importance": "important" | "critical" | "optional" (for mark_important),
          "reasoning": "Individual change reasoning"
        }
      ],
      "explanation": {
        "changed": "Brief summary of what was optimized (e.g. 'Gym moved to evening, study shortened')",
        "why": "Clear behavioral rationale (e.g. 'You repeatedly avoid studying after workouts. Separated them to keep focus high.')",
        "confidence": "high" | "medium" | "low"
      }
    }
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `User's replanning request: "${userText || 'Optimize my day'}"`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            card: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["schedule_proposal"] },
                payload: {
                  type: Type.OBJECT,
                  properties: {
                    changes: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          action: { type: Type.STRING, enum: ["delete", "move_to_tomorrow", "change_time", "reduce_duration", "add"] },
                          taskId: { type: Type.STRING },
                          newTime: { type: Type.STRING },
                          durationMinutes: { type: Type.INTEGER },
                          newTaskTitle: { type: Type.STRING },
                          reasoning: { type: Type.STRING }
                        },
                        required: ["action", "reasoning"]
                      }
                    },
                    explanation: {
                      type: Type.OBJECT,
                      properties: {
                        changed: { type: Type.STRING },
                        why: { type: Type.STRING },
                        confidence: { type: Type.STRING, enum: ["high", "medium", "low"] }
                      },
                      required: ["changed", "why", "confidence"]
                    }
                  },
                  required: ["changes", "explanation"]
                }
              },
              required: ["type", "payload"]
            }
          },
          required: ["message", "card"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from schedule optimizer");
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Schedule optimize error:", error);
    handleApiError(res, error, "Failed to optimize schedule.");
  }
});

// 2.3. Project & Study Planner API (Tier 3)
app.post("/api/planner", async (req, res) => {
  try {
    const { planType, title, goal, deadline, details } = req.body;
    if (!planType || !title) {
      res.status(400).json({ error: "planType and title are required" });
      return;
    }

    const ai = getGeminiClient();

    let systemInstruction = "";
    let responseSchemaType = ""; // study_roadmap or project_milestone

    // Route internally by planType to keep prompts small and specialized
    switch (planType) {
      case "study":
      case "exam": {
        responseSchemaType = "study_roadmap";
        systemInstruction = `You are a Study Planner Coach for the DayFlow app.
Your job is to take a course topic, chapters/syllabus details, exam date, and difficulty, and generate a step-by-step study syllabus plan.
Decompose the materials into structured units (phases) with estimated focus durations (in minutes).
Do NOT perform deadline date math yourself. Focus purely on decomposing the study topics into manageable learning modules.
Write the coaching message in a warm, friendly, natural human tone (like a supportive peer, never asking abrupt/rigid questions, never demanding a list of problems, never referencing code or system errors).
Output a JSON containing a coaching message and a study_roadmap card payload:
{
  "message": "Friendly study guide message explaining the study roadmap.",
  "card": {
    "type": "study_roadmap",
    "payload": {
      "title": "Study Roadmap for ${title}",
      "topic": "${title}",
      "deadline": "${deadline || ''}",
      "phases": [
        {
          "name": "Phase Name (e.g. Unit 1: Foundations)",
          "estimatedMinutes": 180,
          "subtasks": [
            { "title": "Read Chapter 1 notes", "durationMinutes": 60 },
            { "title": "Solve Chapter 1 practice problems", "durationMinutes": 120 }
          ]
        }
      ]
    }
  }
}`;
        break;
      }
      case "project":
      case "career": {
        responseSchemaType = "project_milestone";
        systemInstruction = `You are a Career and Design Project Planner Coach for DayFlow.
Your job is to help users decompose long-horizon projects (like building design portfolios, applying for internships, UCEED preparation) into phased milestones.
Decompose vague goals into concrete subtasks.
Write the coaching message in a warm, friendly, natural human tone (like a supportive peer, never asking abrupt/rigid questions, never demanding a list of problems, never referencing code or system errors).
Output a JSON containing a coaching message and a project_milestone card payload:
{
  "message": "Friendly design planning guidance outlining project phases.",
  "card": {
    "type": "project_milestone",
    "payload": {
      "title": "${title}",
      "goal": "${goal || ''}",
      "deadline": "${deadline || ''}",
      "phases": [
        {
          "title": "Phase Title (e.g. Phase 1: Case Studies)",
          "order": 1,
          "subtasks": [
            { "title": "Draft case study text", "durationMinutes": 90 },
            { "title": "Render visual hero shots", "durationMinutes": 120 }
          ]
        }
      ]
    }
  }
}`;
        break;
      }
      case "fitness": {
        responseSchemaType = "project_milestone";
        systemInstruction = `You are a Fitness & Health Planner Coach for DayFlow.
Your job is to take a fitness goal (e.g. lose 5kg, strength training), frequency, and details, and generate scheduled workout sessions.
For each phase (representing weeks or splits), specify the targeted workout routines and list exercises.
Write the coaching message in a warm, friendly, natural human tone (like a supportive peer, never asking abrupt/rigid questions, never demanding a list of problems, never referencing code or system errors).
Output a JSON containing a coaching message and a fitness project milestone payload:
{
  "message": "Friendly, encouraging health coach motivation outlining your training schedule.",
  "card": {
    "type": "project_milestone",
    "payload": {
      "title": "${title}",
      "goal": "${goal || ''}",
      "deadline": "${deadline || ''}",
      "phases": [
        {
          "title": "Workout Splits (e.g. Push, Pull, Legs)",
          "order": 1,
          "subtasks": [
            { "title": "🏋️ Upper Body Strength", "durationMinutes": 60, "description": "Dumbbell Press\\nLat Pulldowns\\nShoulder Raises" }
          ]
        }
      ]
    }
  }
}`;
        break;
      }
      case "habit":
      default: {
        responseSchemaType = "study_roadmap";
        systemInstruction = `You are a Habit and Productivity Coach for DayFlow.
Decompose this habit building program (e.g. daily reading, meditation) into consistency steps.
Write the coaching message in a warm, friendly, natural human tone (like a supportive peer, never asking abrupt/rigid questions, never demanding a list of problems, never referencing code or system errors).
Output a JSON containing a coaching message and a study_roadmap card payload:
{
  "message": "Friendly, encouraging habit coaching message for consistency.",
  "card": {
    "type": "study_roadmap",
    "payload": {
      "title": "${title}",
      "topic": "${title}",
      "deadline": "${deadline || ''}",
      "phases": [
        {
          "name": "Phase Name (e.g. Week 1: Friction Reduction)",
          "estimatedMinutes": 30,
          "subtasks": [
            { "title": "Read 10 pages in morning", "durationMinutes": 30 }
          ]
        }
      ]
    }
  }
}`;
        break;
      }
    }

    const payload = `Topic/Goal: "${title}"\nGoal Description: "${goal || ''}"\nDeadline: "${deadline || ''}"\nDetails: "${details || ''}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: payload,
      config: {
        systemInstruction,
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            card: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["study_roadmap", "project_milestone"] },
                payload: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    goal: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    deadline: { type: Type.STRING },
                    phases: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          name: { type: Type.STRING },
                          order: { type: Type.INTEGER },
                          estimatedMinutes: { type: Type.INTEGER },
                          subtasks: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                title: { type: Type.STRING },
                                durationMinutes: { type: Type.INTEGER },
                                description: { type: Type.STRING }
                              },
                              required: ["title", "durationMinutes"]
                            }
                          }
                        }
                      }
                    }
                  },
                  required: ["title", "phases"]
                }
              },
              required: ["type", "payload"]
            }
          },
          required: ["message", "card"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from planner");
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Planner error:", error);
    handleApiError(res, error, "Failed to generate plan.");
  }
});

// 2.4. Behavioral Reflection API (Tier 3)
app.post("/api/reflection", async (req, res) => {
  try {
    const { completedCount, pendingCount, streak, telemetry, today } = req.body;
    const ai = getGeminiClient();

    const systemPrompt = `You are the Behavioral Reflection Coach for the DayFlow app.
Your job is to conduct a gentle, empathetic evening check-in review with the user.
Evaluate their daily stats:
- Completed tasks: ${completedCount || 0}
- Pending/unfinished tasks: ${pendingCount || 0}
- Active consistency streak: ${streak || 0} days

Simple Telemetry (avoidance and friction patterns):
${JSON.stringify(telemetry || {})}

Instructions:
- Acknowledge their effort non-judgmentally.
- Highlight any avoided tasks/categories (e.g. if portfolio was delayed multiple times).
- Suggest a single high-impact change for tomorrow to prevent avoidance loop (e.g. reducing duration or breaking down the task).
- Output your response strictly as a JSON object containing:
{
  "message": "Empathetic review summary and encouragement.",
  "card": {
    "type": "reflection",
    "payload": {
      "stats": {
        "completed": ${completedCount || 0},
        "pending": ${pendingCount || 0},
        "streak": ${streak || 0}
      },
      "avoidanceHighlight": "Summary of avoided categories or friction detected.",
      "advice": "Actionable, concrete step for tomorrow."
    }
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Conduct review for date: ${today || new Date().toISOString().split("T")[0]}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            card: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["reflection"] },
                payload: {
                  type: Type.OBJECT,
                  properties: {
                    stats: {
                      type: Type.OBJECT,
                      properties: {
                        completed: { type: Type.INTEGER },
                        pending: { type: Type.INTEGER },
                        streak: { type: Type.INTEGER }
                      },
                      required: ["completed", "pending", "streak"]
                    },
                    avoidanceHighlight: { type: Type.STRING },
                    advice: { type: Type.STRING }
                  },
                  required: ["stats", "avoidanceHighlight", "advice"]
                }
              },
              required: ["type", "payload"]
            }
          },
          required: ["message", "card"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from reflection coach");
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Reflection error:", error);
    handleApiError(res, error, "Failed to generate reflection analysis.");
  }
});

// 3.4. Micro-Coach API — cheap endpoint for motivational nudges and friction coaching
app.post("/api/micro-coach", async (req, res) => {
  try {
    const { userText, behaviorSignals } = req.body;
    if (!userText || typeof userText !== "string") {
       return res.status(400).json({ error: "userText required" });
    }

    const systemPrompt = `You are DayFlow's friendly micro-coach.
Your job is to provide short, punchy (1-3 sentences) behavioral coaching, motivation, or friction-busting advice.
Be warm, empathetic, and speak in a friendly, supportive human tone. Do not ask abrupt questions or output system error details.
Recent behavior signals: ${behaviorSignals || "(none)"}`;

    const t0 = performance.now();
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `User says: "${userText}"`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });
    console.log(`[AI] /api/micro-coach inference: ${(performance.now() - t0).toFixed(2)}ms`);

    res.json({ message: response.text });
  } catch (error: any) {
    console.error("Micro-Coach Error:", error);
    handleApiError(res, error, "Failed to get coaching.");
  }
});

// 3.4.1 Chat API — SSE streaming for general conversation
app.post("/api/chat", async (req, res) => {
  try {
    const { userText, scheduleSummary } = req.body;
    if (!userText || typeof userText !== "string") {
       return res.status(400).json({ error: "userText required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const systemPrompt = `You are DayFlow's conversational assistant, behaving as a warm, friendly, supportive companion and day coach—never as a cold, mechanical system or interrogator.
Your communication guidelines:
1. Speak in a natural, supportive, human tone. Talk like a friendly peer who is pair-programming or co-planning their life with them.
2. NEVER ask abrupt, mechanical questions, and avoid directly demanding their "problems" (which can feel intimidating and hard to answer).
3. For initial conversations, start with wide-ranged, welcoming questions rather than specific probing (e.g., "Tell me a bit about what you do and what your day-to-day life is like right now. What are you working on or hoping to build?", or "What is the urgent work or goals you want to plan today?").
4. Let the conversation flow naturally. Do not bombard the user with questions. Only ask targeted follow-up questions *after* they share some details (e.g., if they mention a gym goal, ask about their target weight, preferred split, or plans, rather than random, useless questions).
5. Never output raw code blocks or technical system errors to the user. Express any issues or warnings in natural, empathetic, conversational language.
6. Keep your responses casual, simple, and structured in short points. Avoid long paragraphs, wordy intros, or verbose explanations. Write in a relaxed, friendly text-message style (no excessive emojis, no lecturing).
7. Current schedule summary:
${scheduleSummary || "(none)"}`;

    const t0 = performance.now();
    const ai = getGeminiClient();
    const resultStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: `User says: "${userText}"`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    console.log(`[AI] /api/chat prompt build: ${(performance.now() - t0).toFixed(2)}ms`);

    let t1 = performance.now();
    let firstToken = true;

    for await (const chunk of resultStream) {
      if (firstToken) {
        console.log(`[AI] /api/chat TTFT: ${(performance.now() - t1).toFixed(2)}ms`);
        firstToken = false;
      }
      if (chunk.text) {
        // SSE format requires "data: " prefix and double newline
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.write(`data: ${JSON.stringify({ error: "Failed to get chat response" })}\n\n`);
    res.end();
  }
});

// 3.5. Task Metadata Classification API — auto-tags tasks based on title/description
app.post("/api/classify-task", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || typeof title !== "string") {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const systemPrompt = `You are the Task Metadata Classifier for DayFlow.
Your job is to analyze a task's title and description and classify it into specific metadata layers.
Choose the most appropriate enum values for each field.

Metadata Schema & Enums:
1. category:
   - "study" (lectures, exams, schoolwork, revision)
   - "project" (milestones, app building, portfolio, design work)
   - "meeting" (calls, interviews, live discussions, classes)
   - "health" (workouts, gym, exercise, runs, stretch, doctor)
   - "habit" (consistency items, reading, meditation, sleep)
   - "admin" (chores, laundry, groceries, bills, cleaning)
   - "social" (events, friends, dinners, calls to family)
   - "creative" (sketching, art, writing, music)
   - "personal" (routine personal items)
   - "misc" (relaxation, movies, gaming, unstructured time)

2. rigidity:
   - "fixed" (Missed = gone forever. e.g., live lectures, exams, meetings, appointments)
   - "semi_flexible" (Can move but carries cost/disruption. e.g., gym workout, exam revision)
   - "flexible" (Easy to move. e.g., chores, laundry, unstructured reading)

3. importance:
   - "critical" (Severe consequences if skipped/delayed)
   - "important" (Standard priority, default)
   - "optional" (Low stakes, minimal consequences)

4. recoverability:
   - "impossible" (Cannot be recovered directly. e.g., a live lecture slot, an exam)
   - "hard" (Requires high effort to catch up. e.g., a major project block, deep study)
   - "easy" (Simple to compensate later. e.g., buy soap, clean desk)

5. dependency_chain:
   - "none" (Does not affect or block any other tasks)
   - "weak" (May influence, but doesn't block other tasks)
   - "strong" (Blocks future tasks. e.g., research before writing, setting up tools)

6. progress_type:
   - "binary" (Either done or not. e.g., submit a form, pay rent)
   - "compound" (Each session builds on the previous. e.g., studying course, fitness training, building app)
   - "streak" (Consistency matters heavily. e.g., habits, meditation)

7. deadline_pressure:
   - "none" (No deadline)
   - "low" (Deadline is far away, > 1 week)
   - "medium" (Deadline is in 3-7 days)
   - "high" (Deadline is in 1-2 days)
   - "critical" (Deadline is today)

Confidence Scoring Guidelines:
- Return a confidence value from 0.0 to 1.0 based on how clear the task semantics are.
- Clear matches (e.g. "math lecture", "leg day workout") -> 0.9+
- Vague titles (e.g. "something", "do task") -> < 0.5

Respond ONLY with a valid JSON object conforming exactly to this structure. Do not include markdown code block syntax, formatting tags, or preambles.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Classify this task:\nTitle: "${title}"\nDescription: "${description || ''}"`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meta: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, enum: ["study", "project", "meeting", "health", "habit", "admin", "social", "creative", "personal", "misc"] },
                rigidity: { type: Type.STRING, enum: ["fixed", "semi_flexible", "flexible"] },
                importance: { type: Type.STRING, enum: ["critical", "important", "optional"] },
                recoverability: { type: Type.STRING, enum: ["impossible", "hard", "easy"] },
                dependency_chain: { type: Type.STRING, enum: ["none", "weak", "strong"] },
                progress_type: { type: Type.STRING, enum: ["binary", "compound", "streak"] },
                deadline_pressure: { type: Type.STRING, enum: ["none", "low", "medium", "high", "critical"] }
              },
              required: ["category", "rigidity", "importance", "recoverability", "dependency_chain", "progress_type", "deadline_pressure"]
            },
            confidence: { type: Type.NUMBER },
            source: { type: Type.STRING, enum: ["ai"] }
          },
          required: ["meta", "confidence", "source"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response received from classifier model");
    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("Task classification API error:", error);
    handleApiError(res, error, "Failed to classify task.");
  }
});

// 3.55 Daily Execution Plan API — generates per-day actionable steps for a task
app.post("/api/daily-plan", async (req, res) => {
  try {
    const { taskTitle, taskDescription, durationMinutes, timeOfDay, previousPlans } = req.body;
    if (!taskTitle || typeof taskTitle !== "string") {
      res.status(400).json({ error: "taskTitle is required" });
      return;
    }

    const duration = Number(durationMinutes) || 60;
    const timeContext = timeOfDay === "morning" ? "morning (high focus time)"
      : timeOfDay === "afternoon" ? "afternoon (moderate energy)"
      : timeOfDay === "evening" ? "evening (wind-down)"
      : "daytime";

    const prevPlansText = Array.isArray(previousPlans) && previousPlans.length > 0
      ? `\nPrevious sessions:\n${previousPlans.slice(-3).map((p: string, i: number) => `- Session ${i + 1}: ${p}`).join("\n")}`
      : "";

    const systemPrompt = `You are a productivity coach generating a concrete daily execution plan.
Given a task and context, produce 3–5 specific, actionable steps the user should do in their ${duration}-minute slot today (${timeContext}).
Each step must:
- Start with an action verb (e.g. "Review", "Write", "Practice", "Draft", "Set up", "Read")
- Be concrete enough to start immediately
- Fit within the allotted time${prevPlansText ? "\n- Build on what was done in previous sessions" : ""}
Return ONLY a valid JSON object. No markdown, no preamble.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Task: "${taskTitle}"\nDescription/context: "${taskDescription || "None"}"\nDuration: ${duration} minutes\nTime: ${timeContext}${prevPlansText}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING, description: "A single concrete action step" }
            },
            estimated_minutes: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER, description: "Estimated minutes for each step" }
            }
          },
          required: ["steps"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from daily plan model");
    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("Daily plan API error:", error);
    handleApiError(res, error, "Failed to generate daily plan.");
  }
});



// 3.6 Task Decomposition API — splits vague/long tasks into exactly 3 actionable steps
app.post("/api/decompose-task", async (req, res) => {
  try {

    const { taskTitle, duration } = req.body;
    if (!taskTitle || typeof taskTitle !== "string") {
      res.status(400).json({ error: "taskTitle is required" });
      return;
    }

    const durationVal = Number(duration) || 60;

    const systemPrompt = `You are a task decomposition coach.
Your job is to break down a vague or large task into exactly 3 smaller, highly concrete, actionable sub-tasks.
Each sub-task must be concrete, meaning it starts with a physical action verb (e.g. "Draft case study intro", "Write 2 code files", "Pack sports bag") rather than a vague idea (e.g. "Work on portfolio").
For the sub-tasks:
- Distribute the total duration of ${durationVal} minutes reasonably among the 3 sub-tasks so their sum matches ${durationVal}.
- Return exactly 3 sub-tasks.

Respond ONLY with a valid JSON object matching the schema. Do not include markdown code block syntax, formatting tags, or preambles.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Decompose this task: "${taskTitle}" with total duration ${durationVal} minutes.`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Concrete, actionable title starting with a verb" },
                  duration: { type: Type.INTEGER, description: "Duration in minutes" }
                },
                required: ["title", "duration"]
              }
            }
          },
          required: ["subtasks"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response received from decomposition model");
    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("Task decomposition API error:", error);
    handleApiError(res, error, "Failed to decompose task.");
  }
});



// 4. Task Consequence Narrative API — generates structured coaching-style consequence narratives and negotiation options
app.post("/api/task-consequence", async (req, res) => {
  try {
    const {
      taskTitle,
      taskDescription,
      taskMeta,
      consequenceCore,
      streakDays,
      linkedGoalTitle,
      linkedGoalProgress,
      recentCompletions,
      userProfileName,
      intent,
      delayMins,
    } = req.body;

    if (!taskTitle || typeof taskTitle !== "string") {
      res.status(400).json({ error: "taskTitle is required" });
      return;
    }

    const intentVal = intent || "preview";
    const delayVal = delayMins || 0;
    const metaVal = taskMeta || {};
    const coreVal = consequenceCore || {};

    const streakLine = streakDays > 0 ? `User's current streak: ${streakDays} day${streakDays > 1 ? "s" : ""}.` : "No active streak.";
    const goalLine = linkedGoalTitle ? `Linked goal: ${linkedGoalTitle}${linkedGoalProgress ? ` — Progress: ${linkedGoalProgress}` : ""}.` : "No linked goal.";
    const historyLine = recentCompletions && recentCompletions.length > 0
      ? `Recent completions of similar tasks: ${(recentCompletions as string[]).join(", ")}.`
      : "No recent similar task history.";
    const descLine = taskDescription ? `Task details: ${taskDescription}.` : "";

    const systemPrompt = `You are the consequence reasoning engine for DayFlow, a personal productivity coach app.
Your job is not to schedule tasks. The schedule is already calculated.
Your job is to translate the schedule impact and core metrics into meaningful human consequences.

DayFlow core philosophy:
DayFlow does not optimize for completing every task. DayFlow optimizes for preserving meaningful progress while minimizing decision fatigue, burnout, and self-deception.

RULES (follow strictly):
- DO NOT use bullet points or numbered lists.
- Write like a coach speaking honestly to a friend — matter-of-fact, calm, intelligent, and supportive.
- Do NOT use abstract mathematical formulas in the effects text. Explain real-life consequences.
- Avoid guilt-tripping. Frame choices as tradeoffs.

Your output must be a valid JSON object containing:
1. "immediate_effect": A short, factual one-sentence statement explaining what changes today.
2. "cascade_effect": A short description of the impact on future tasks/days (backlogs, tomorrow's load, week compression).
3. "goal_effect": Explaining the long-term significance of this task for their larger goals or streak consistency.
4. "emotional_weight": "none" | "low" | "medium" | "high" | "critical" (based on meta importance, rigidity, and goal impact).
5. "primary_message_slot": "immediate" | "cascade" | "goal" (which effect is the strongest and should be shown as a one-line preview).
6. "recommendation":
   - "best_action": The ideal recovery path.
   - "minimum_viable_progress": A tiny, low-friction compromise (e.g. "Do 15 mins now to keep the momentum alive") to prevent binary all-or-nothing collapse.
7. "negotiation_options": An array of alternative options that are relevant. Each option should specify:
   - "strategy": "reduce_scope" | "reschedule" | "restructure" | "skip"
   - "label": Clear action label (e.g., "Do 20 mins now", "Move to 8 PM", "Split into 2 sessions")
   - "consequence_delta": Explain the positive trade-off (e.g. "Saves 40 min, preserves streak", "Pushes half to tomorrow")
   - "command": { "type": "shorten_duration" | "move_to_gap" | "split_into_chunks" | "mark_partial" | "swap_tasks", "params": { ... } }

Note on Tone adaptation by user intent:
- "preview": informative, realistic.
- "skip": warning, highlighting what is lost.
- "delay": negotiation, focus on slot compression.
- "break": warning, focus on succeeding shifts.

Respond ONLY with a valid JSON object conforming exactly to this structure. Do not include markdown code block characters, notes, formatting tags, or preambles.`;

    const userMessage = `Task: "${taskTitle}"
Description: ${descLine}
Intent: ${intentVal} (${delayVal} min delay)
Metadata: ${JSON.stringify(metaVal)}
Core Programmatic Impact: ${JSON.stringify(coreVal)}
Context: ${streakLine} ${goalLine} ${historyLine}
${userProfileName ? `User Profile: ${userProfileName}` : ""}

Generate the Consequence JSON:`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            immediate_effect: { type: Type.STRING },
            cascade_effect: { type: Type.STRING },
            goal_effect: { type: Type.STRING },
            emotional_weight: { type: Type.STRING, enum: ["none", "low", "medium", "high", "critical"] },
            primary_message_slot: { type: Type.STRING, enum: ["immediate", "cascade", "goal"] },
            recommendation: {
              type: Type.OBJECT,
              properties: {
                best_action: { type: Type.STRING },
                minimum_viable_progress: { type: Type.STRING }
              },
              required: ["best_action", "minimum_viable_progress"]
            },
            negotiation_options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  strategy: { type: Type.STRING, enum: ["reduce_scope", "reschedule", "restructure", "skip"] },
                  label: { type: Type.STRING },
                  consequence_delta: { type: Type.STRING },
                  command: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, enum: ["shorten_duration", "move_to_gap", "split_into_chunks", "mark_partial", "swap_tasks"] },
                      params: { type: Type.OBJECT }
                    },
                    required: ["type"]
                  }
                },
                required: ["strategy", "label", "consequence_delta", "command"]
              }
            }
          },
          required: ["immediate_effect", "cascade_effect", "goal_effect", "emotional_weight", "primary_message_slot", "recommendation", "negotiation_options"]
        }
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from model");

    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("Task Consequence Error:", error);
    handleApiError(res, error, "Failed to generate consequence insight.");
  }
});
// 5. AI Reasoning API — hybrid rule-engine/LLM context reasoning endpoint
app.post("/api/ai-reasoning", async (req, res) => {
  try {
    const { trigger, context, staleTasksSummary } = req.body;
    
    const triggerType = trigger || "reflection";
    const compactContext = context || {};
    const staleTasks = staleTasksSummary || [];
    const behaviorSignals = compactContext.behaviorSignals || {};

    // 1. DETERMINISTIC RULE ENGINE FOR ADJUSTMENTS
    const proposals: any[] = [];
    let hasHighRiskChange = false;

    staleTasks.forEach((task: any) => {
      if (task.rigidity === "fixed") {
        proposals.push({
          type: "expire",
          taskId: task.id,
          reason: "Deterministic: Fixed calendar event cannot be carried forward after time slot expires."
        });
        hasHighRiskChange = true;
      } else if (task.carry_over_count >= 3) {
        proposals.push({
          type: "split",
          taskId: task.id,
          reason: "Deterministic: Task deferred repeatedly. Splitting into smaller 20-minute focus slots."
        });
        hasHighRiskChange = true;
      } else {
        proposals.push({
          type: "carry_over",
          taskId: task.id,
          reason: "Deterministic: Carried over to tomorrow's list."
        });
      }
    });

    // 2. LLM CALL ONLY FOR PERSONALIZED COACHING EXPLANATION
    const systemPrompt = `You are the AI Behavioral Coach for DayFlow.
Your job is NOT to calculate task adjustments. The adjustments have already been computed deterministically.
Your job is to translate these adjustments into a warm, human-like, highly-personalized coaching explanation ("message") explaining WHY we are proposing these changes, directly referencing the user's implicit behavioral signals (planning bias, fatigue windows, avoidance patterns).

DayFlow Philosophy:
Humans fail due to bad self-models (self-perception errors) and overload, not laziness. Be supportive, honest, and direct.

Rules:
- DO NOT use bullet points, numbered lists, or code references in your message. Write a single unified paragraph (max 3-4 sentences).
- Speak like an elite coach talking to a friend — matter-of-fact, calm, intelligent, and supportive.
- Address the user based on their specific patterns:
  - If a task is split: explain that they've delayed it multiple times, suggesting avoidance of task size/friction, and we split it to get them started.
  - If they are overloaded (overloadRisk is high): explain that today's load exceeds their sustainable completed average, and we need to push items to tomorrow to prevent burnout.
  - Check their friction reasons (e.g. low energy, resistance) and link them to the adjustment logic.

Your output must conform to this schema:
{
  "proposalRisk": "low" | "medium" | "high",
  "message": "Your coaching explanation."
}`;

    const userMessage = `Trigger: ${triggerType}
Deterministic proposals: ${JSON.stringify(proposals)}
Current State: ${JSON.stringify(compactContext.currentState || {})}
Goal Impact: ${JSON.stringify(compactContext.goalImpact || [])}
Behavioral Signals: ${JSON.stringify(behaviorSignals)}

Generate the coaching message:`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            proposalRisk: { type: Type.STRING, enum: ["low", "medium", "high"] },
            message: { type: Type.STRING }
          },
          required: ["proposalRisk", "message"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from AI Reasoning engine");

    const parsed = JSON.parse(text);
    
    // Override proposalRisk to medium/high if we have splits/expires to enforce user review
    let finalRisk = parsed.proposalRisk || "low";
    if (hasHighRiskChange && finalRisk === "low") {
      finalRisk = "medium";
    }

    res.json({
      proposalRisk: finalRisk,
      message: parsed.message,
      proposals
    });

  } catch (error: any) {
    console.error("AI Reasoning Endpoint Error:", error);
    handleApiError(res, error, "Failed to run AI reasoning.");
  }
});







// 3.7 Subtasks Analysis API — analyzes bullet points, estimates durations, and coaches
app.post("/api/analyze-subtasks", async (req, res) => {
  try {
    const { taskTitle, currentDuration, subtasksText } = req.body;
    if (!subtasksText || typeof subtasksText !== "string") {
      res.status(400).json({ error: "subtasksText is required" });
      return;
    }

    const durationVal = Number(currentDuration) || 60;

    const systemPrompt = `You are an execution planning coach.
Analyze the user's list of subtasks for the task "${taskTitle || "Task"}".
Based on the list of subtasks:
1. Estimate a realistic focus duration (in minutes) for each subtask.
2. Sum them up to suggest a new total task duration.
3. Write a brief (1-2 sentences), warm coaching message explaining why this duration is proposed. For example: "Since you added 'Write Unit Tests', this will likely take an extra 30 minutes. I suggest adjusting the task duration."
4. If the subtasks list seems empty, return the suggested_duration as currentDuration (${durationVal}).

Respond strictly with a valid JSON matching this schema:
{
  "suggested_duration": number,
  "message": "Coaching message",
  "subtasks": [
    { "title": "string", "duration": number }
  ]
}`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Task: "${taskTitle}"
Current Duration: ${durationVal} minutes
Subtasks written by user:
${subtasksText}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggested_duration: { type: Type.INTEGER },
            message: { type: Type.STRING },
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  duration: { type: Type.INTEGER }
                },
                required: ["title", "duration"]
              }
            }
          },
          required: ["suggested_duration", "message", "subtasks"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from analyze-subtasks model");
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Analyze subtasks API error:", error);
    handleApiError(res, error, "Failed to analyze subtasks.");
  }
});


// Global Error Handler for Vercel
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Express Error:", err);
  res.status(500).json({ error: "Internal Server Error: " + (err.message || String(err)) });
});

// Vite middleware / client routing setup
async function startServer() {
  const listenPort = process.env.NODE_ENV !== "production"
    ? await findAvailablePort(PORT)
    : PORT;
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api")) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      index: false, // Prevents Express from automatically serving index.html blindly
      setHeaders: (res, filePath) => {
        // If the browser requests the main index page, tell it to check for updates every time
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        } else {
          // It is completely fine to cache your hashed JS/CSS assets indefinitely
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(listenPort, "0.0.0.0", () => {
    console.log(`[Server] Running and listening on http://localhost:${listenPort}`);
  });
}

if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export default app;
