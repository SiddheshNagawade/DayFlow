import express from "express";
import net from "net";
import path from "path";
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

// 3. Schedule Adjustment API — user describes changes in plain text, AI returns structured modifications
app.post("/api/adjust-schedule", async (req, res) => {
  try {
    // V3.1: Read compressed text summaries instead of raw task arrays
    const { userText, scheduleSummary, pendingSummary, currentSchedule, pendingTasks, today, image, routineBlocksSummary, calendarEventsSummary } = req.body;
    if (!userText || typeof userText !== "string" || userText.trim() === "") {
      res.status(400).json({ error: "Change description is required" });
      return;
    }

    const ai = getGeminiClient();

    // Support both legacy raw arrays and new V3.1 compressed text summaries
    const scheduleContext = scheduleSummary ||
      (currentSchedule || [])
        .map((item: any) => `- "${item.title}" [${item.type}] ${item.start_time}–${item.end_time} id="${item.id}"`)
        .join("\n");

    const pendingContext = pendingSummary ||
      (pendingTasks || [])
        .slice(0, 15) // hard cap even for legacy path
        .map((t: any) => `- "${t.title}" (${t.duration_minutes}min) id="${t.id}" scheduled="${t.scheduled_date || 'backlog'}"`)
        .join("\n");

    const systemPrompt = `You are a narrow personal schedule assistant for the DayFlow app.
Today's Date is: ${today}.

## Strict Scope of Responsibilities
You are NOT a general assistant, life coach, or generic conversational partner. You have ONLY 4 jobs:
1. Parse messy input: Convert messy user statements ("wasted 3 hours doomscrolling") into structured changes (e.g. log friction, delay, or park tasks).
2. Explain suggestions: Provide a brief, evidence-based reason when a user clicks "Why?" or asks for schedule suggestions.
3. Reflection coaching: Conduct the evening check-in review Conversational flow.
4. Decompose vague tasks: Break large/vague tasks (>120 mins, carryover >= 3, or unclear tasks) into exactly 3 bite-sized concrete steps.

If the user attempts to chat about unrelated subjects (programming, life advice, recipes, general talk), politely refuse and bring the focus back to schedule and execution coaching.

Current schedule for today:
${scheduleContext || "(empty)"}

Pending flexible tasks (backlog):
${pendingContext || "(none)"}

Active routine blocks (recurring templates):
${routineBlocksSummary || "(none)"}

Calendar events / Vacations / Holidays logged:
${calendarEventsSummary || "(none)"}

Based on the user's input, return a response matching the JSON structure blueprint below.

### JSON STRUCTURE BLUEPRINT:
Your response must conform exactly to this structure. Return only keys from this template:
{
  "changes": [
    {
      "action": "delete" | "move_to_tomorrow" | "move_to_date" | "change_time" | "reduce_duration" | "add" | "cant_do_today" | "add_goal" | "update_goal" | "record_weight" | "generate_workout_plan" | "propose_actual_time" | "add_routine" | "add_event" | "add_project",
      "taskId": "string representing the task/goal ID to modify (empty/omit for add/add_goal/add_project)",
      "newDate": "YYYY-MM-DD (used only for move_to_date)",
      "newTime": "HH:MM (used for change_time/add_routine to schedule/pin at specific time)",
      "durationMultiplier": 0.5, // number (used only for reduce_duration to scale length, e.g. 0.5)
      "newTaskTitle": "string (used only for action=add/add_routine/add_event)",
      "newTaskDuration": 30, // integer minutes (used only for action=add)
      "newTaskDescription": "string (used when action=add and the task has workout steps or class details. One item per line.)",
      "insertImmediately": true | false, // boolean (used when action=add or action=change_time to pin/start a task/break immediately at the current time without doing calendar time math)
      "goalTitle": "string (used to set/find a goal for add_goal or update_goal)",
      "goalCategory": "fitness" | "academic" | "project" | "habit" | "personal",
      "goalMetric": "string (e.g., 'sessions', 'hours', 'pages')",
      "goalTarget": 10, // integer (new target count for add_goal or update_goal)
      "goalKeywords": ["keyword1", "keyword2"], // array of keywords to auto-match task titles
      "weightValue": 75.5, // number in kg (used only for action=record_weight)
      "proposedDurationMinutes": 120, // integer minutes (used only for action=propose_actual_time)
      "confidence": 0.3 | 0.8 | 1.0, // memory confidence (used for add_routine and add_event)
      "source": "user_direct" | "ai_inferred", // memory source (used for add_routine and add_event)
      "daysOfWeek": [1, 2, 3, 4, 5], // array of integers 0-6 (where 0=Sunday) used for add_routine
      "endTime": "10:00", // HH:MM end time used for add_routine
      "routineType": "sleep" | "class" | "meal" | "commute" | "custom", // category of routine
      "rigidity": "hard" | "soft", // rigidity for add_routine
      "startDate": "YYYY-MM-DD", // date used for add_event
      "endDate": "YYYY-MM-DD", // date used for add_event
      "eventType": "routine_override" | "event", // event type for add_event
      "suspendRoutineTypes": ["sleep", "class", "meal", "commute", "custom"], // array of routine types to suspend during routine_override
      "projectTitle": "string (used only for action=add_project)",
      "projectGoal": "string (used only for action=add_project)",
      "projectDeadline": "YYYY-MM-DD (used only for action=add_project)",
      "projectPhases": [
        {
          "title": "string (e.g. Phase 1 / Unit 1)",
          "order": 1,
          "subtasks": [
            { "title": "string (e.g. Diffusion study)", "duration_minutes": 90 }
          ]
        }
      ],
      "reasoning": "Brief explanation for the change"
    }
  ],
  "message": "A supportive, conversational explanation of the changes. If there are clarifying questions (e.g. missing room number, unclear times), include them here.",
  "clarificationNeeded": false, // set to true if critical info is missing or you need clarification to formulate a detailed multi-task schedule plan
  "clarificationQuestions": [
    {
      "id": "project_type",
      "label": "What stage/type of project is this?",
      "type": "select" | "text",
      "options": ["Option 1", "Option 2"], // required if type is select
      "placeholder": "Enter details..." // optional if type is text
    }
  ]
}

### CRITICAL WIZARD CLARIFICATION RULE:
- If the user enters a vague, open-ended task or plan request (e.g., "create a gym plan", "make a study schedule for my exams", "plan my portfolio website development"), DO NOT immediately schedule a single generic block.
- Instead, set "clarificationNeeded": true and generate 2 to 4 structured questions in "clarificationQuestions".
- **Crucial Feature:** If you need the user to manually define their specific chapters, modules, or project steps, include a question with "type": "task_list" (e.g., "What specific tasks or chapters do you want to cover?"). This renders a dynamic UI where the user can click 'Add Task' and type their exact tasks and minute durations.

### TIME CALCULATION RULE (AVOID HALLUCINATION):
- DO NOT calculate start/end clock hours or absolute times yourself (e.g. do not calculate that 3:15 PM + 45 minutes = 4:00 PM).
- For relative placements like "add a break now", "give me a rest immediately", or "do this task right now", set "insertImmediately": true on the action ("add" or "change_time") instead of guessing/calculating "newTime".

### ACTION RULES:
- "add": Propose adding a task (e.g. a rest block like title "Rest / Break" with duration 30 and "insertImmediately": true, or a new backlog item). If the task has exercises or lecture room info, put each item on a new line in "newTaskDescription".
- "delete": Remove task by taskId.
- "move_to_tomorrow": Move task by taskId to tomorrow.
- "change_time": Shift task by taskId to start at "newTime" (absolute) or right now ("insertImmediately": true).
- "reduce_duration": Shorten task duration using "durationMultiplier".
- "add_goal": Create a new goal.
- "update_goal": Change target/parameters of an existing goal when user requests it. Specify the goal by matching "taskId" (goal id) or "goalTitle" (goal name), and specify the new target in "goalTarget".
- "record_weight": When the user logs their weight (e.g. "today 74.5 kg" or "I weigh 80kg"), create this action with "weightValue" set to the number in kg.
- "generate_workout_plan": When user shares a workout screenshot or asks you to create a plan, generate one or more "add" actions per day/muscle group. Use "newTaskDescription" to include the individual exercises (one per line) for that day.
- "propose_actual_time": When the user casually mentions how long a task took (e.g., "gym took 2 hours", "spent around 90 mins on science revision", "reading was 45 minutes"), return action "propose_actual_time". Set "taskId" to the matched task id, "proposedDurationMinutes" to the extracted integer minutes, and "confidence" to a score (0.0 to 1.0). If confidence < 0.6, mention it in the message so the user can verify.
- "add_routine": Propose a recurring routine template block (e.g. sleep block, work hours, meals, commutes, classes, etc.) with startTime/endTime (using fields newTime and endTime), daysOfWeek, rigidity, and routineType.
  * Memory Confidence: Set "confidence": 0.3 | 0.8 | 1.0 and "source": "user_direct" | "ai_inferred".
    - Vague/implicit statement (e.g. "I sleep late", "I usually study in the afternoon") -> confidence: 0.3, source: "ai_inferred".
    - Explicit request (e.g. "Save sleep 11 PM to 7 AM every day as a routine") -> confidence: 1.0, source: "user_direct".
- "add_event": Propose a calendar event or routine override.
  * Replaces separate vacation/holiday types.
  * Use "eventType": "routine_override" | "event".
  * If it's a "routine_override" (e.g. family trip, vacation, internship, exam week, holiday), specify "suspendRoutineTypes" with the categories of routines to suspend (e.g. ["class", "commute"]) during the startDate and endDate window.
  * Memory Confidence: Set "confidence" (0.3 | 0.8 | 1.0) and "source" ("user_direct" | "ai_inferred") based on statement clarity.
- "add_project": Propose decomposing a large study block, exam prep, portfolio, or major task into a structured project container.
  * Populate "projectTitle" (e.g., "Material Science Midterm Study"), "projectGoal", "projectDeadline".
  * Provide "projectPhases": an array of phases (e.g. "Phases / Units", "Final Prep"), each containing sequential subtasks with title and duration_minutes (e.g. "Unit 1 Study", 90).
  * Enforce safety confirmation: Projects are proposals. The user must click "Confirm" in the UI to save them.
- Strict Safety Confirmation: You must NOT directly modify or save routines, projects, or overrides without user review. All proposed changes must be outputted as items in the "changes" array so that the UI can present them to the user for explicit confirmation or rejection. Do not make statements claiming changes are active before the user confirms them.

### VISION / IMAGE PARSING RULES:
If an image is attached (college timetable, workout plan screenshot, scale photo, etc.):
1. **Workout Split (e.g. "Monday: Chest & Triceps")**:
   - Create one "add" action per training day.
   - Set "newTaskTitle" to the muscle group (e.g. "Chest & Triceps").
   - Set "newTaskDescription" with the exercises listed as multi-line text.
   - Set "newTaskDuration" to 60 (default gym session).
   - If specific exercises are not visible, set "clarificationNeeded": true and ask in "message".
2. **College Timetable**:
   - Create one "add" action per class/lecture block.
   - Set "newTaskTitle" to the subject name.
   - Set "newTaskDescription" with "Room: [room number]\nLecture Hall: [hall name]" if visible.
   - For any missing room numbers or times, set "clarificationNeeded": true and ask in "message".
3. **Weighing Scale Photo**: Extract the weight reading and use "record_weight" action.

TREAT SUBJECTIVE INPUTS/MOODS GRACEFULLY:
- If the user says they are "tired" or "feeling lazy":
  - Express empathy and recommend a lighter schedule.
  - Propose moving demanding/optional tasks to tomorrow or the backlog (using action "move_to_tomorrow" or "delete").
  - Propose shortening remaining tasks (using action "reduce_duration" with a durationMultiplier e.g., 0.5).
  - Propose adding a rest/break block (using action "add" with title "Rest / Break", "insertImmediately": true, and "newTaskDuration": 30).
- If the user says they are "feeling very productive" or "energetic":
  - Celebrate their energy and suggest capitalizing on it.
  - Propose scheduling 1 or 2 pending tasks from the backlog (using action "add" with the backlog task's title and duration).

DAY SUMMARY & TOMORROW PLANNING:
- If the user requests to "Summarize my day and plan tomorrow" or wants to review/wrap up their day:
  - Summarize the tasks completed vs. those still pending today.
  - Propose shifting all incomplete/pending tasks from today's schedule to tomorrow's date using the action "move_to_tomorrow" for their respective taskIds.
  - Provide a positive, encouraging recap of completed items, and explain the plan for tomorrow in the "message".

PROACTIVE GOAL SETUP & TRACKING:
- Proactively offer to set up a new tracking goal or streak (using action "add_goal") in the changes list if the user:
  - Asks to set a goal or a streak (e.g., "set a gym workout goal for 10 sessions" or "track my study routine").
  - Schedules a new recurring block or routine (e.g. gym/exercise, study sessions, reading, projects) that doesn't have a goal yet.
  - For example, if a user schedules "gym", suggest creating a Fitness Goal of e.g. 20 sessions, and define keywords like ["gym", "workout"].
- Mention the proposed goal or update in your message.

### SPEED AND CONCISENESS RULE (CRITICAL):
- You MUST generate your response as fast as possible to ensure a snappy user experience.
- Keep the "message" short and punchy (1-2 sentences maximum).
- If the user provides answers for a large project (e.g. building a portfolio over a month), DO NOT generate exhaustive daily lists or dozens of tasks. Strict Limit: Generate a maximum of 3 to 5 high-level tasks or phases. Outline just the immediate next steps or major milestones to get the user started. Generating massive JSON payloads will crash the system.

Be concise, warm, non-judgmental, and focused on helping the user stay productive without burning out.
Avoid aggressive exclamation marks and do not issue scary warnings. Respond ONLY with a raw, valid JSON object. Do not include markdown code block characters, notes, formatting tags, or preambles.`;

    // Build contents array — optionally include image for vision
    const contents: any[] = [];
    if (image && image.base64 && image.mimeType) {
      contents.push({
        inlineData: { mimeType: image.mimeType, data: image.base64 }
      });
    }
    contents.push({ text: `User's change request: "${userText}"` });

    const t0 = performance.now();
    // V3.1 Payload logging
    const payloadBytes = JSON.stringify({ userText, scheduleSummary: scheduleContext, pendingSummary: pendingContext }).length;
    console.log(`[AI] /api/adjust-schedule payload: ${payloadBytes} bytes (target <12KB = ${payloadBytes < 12288 ? '✓ OK' : '⚠ OVER'})`);
    console.log(`[AI] prompt build: ${(performance.now() - t0).toFixed(2)}ms`);

    const t1 = performance.now();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
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
                  action: { type: Type.STRING, description: "One of: delete, move_to_tomorrow, move_to_date, change_time, reduce_duration, add, cant_do_today, add_goal, update_goal, record_weight, generate_workout_plan, propose_actual_time, add_routine, add_event, add_project" },
                  taskId: { type: Type.STRING, description: "Task, goal, or project id to modify (empty for add/add_goal/add_project)" },
                  newDate: { type: Type.STRING, description: "YYYY-MM-DD for move_to_date" },
                  newTime: { type: Type.STRING, description: "HH:MM for change_time/add_routine start time" },
                  durationMultiplier: { type: Type.NUMBER, description: "e.g. 0.5 to scale duration for reduce_duration" },
                  newTaskTitle: { type: Type.STRING, description: "Title for new task/routine/event when action is add/add_routine/add_event" },
                  newTaskDuration: { type: Type.INTEGER, description: "Minutes for new task when action=add" },
                  newTaskDescription: { type: Type.STRING, description: "Multi-line detail: exercises or class info, one item per line. Used when action=add." },
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
                  weightValue: { type: Type.NUMBER, description: "Weight in kg if action=record_weight" },
                  proposedDurationMinutes: { type: Type.INTEGER, description: "Proposed duration in minutes for propose_actual_time" },
                  confidence: { type: Type.NUMBER, description: "Confidence score (0.3, 0.8, or 1.0) indicating memory extraction confidence for routines/events" },
                  source: { type: Type.STRING, description: "Memory source: 'user_direct' or 'ai_inferred'" },
                  daysOfWeek: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: "Days of week 0-6 (0=Sunday) for add_routine"
                  },
                  endTime: { type: Type.STRING, description: "HH:MM end time for add_routine" },
                  routineType: { type: Type.STRING, description: "Category of routine: sleep, class, meal, commute, custom for add_routine" },
                  rigidity: { type: Type.STRING, description: "Rigidity: hard or soft for add_routine" },
                  startDate: { type: Type.STRING, description: "YYYY-MM-DD start date for add_event" },
                  endDate: { type: Type.STRING, description: "YYYY-MM-DD end date for add_event" },
                  eventType: { type: Type.STRING, description: "Type of override event: routine_override or event for add_event" },
                  suspendRoutineTypes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Routine categories to suspend during a routine_override, e.g. ['class', 'commute']"
                  },
                  projectTitle: { type: Type.STRING, description: "Title of the project (e.g. 'Material Science Midterm Study')" },
                  projectGoal: { type: Type.STRING, description: "Goal or description of the project" },
                  projectDeadline: { type: Type.STRING, description: "YYYY-MM-DD deadline for the project" },
                  projectPhases: {
                    type: Type.ARRAY,
                    description: "Structured project phases and subtasks",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING, description: "Phase title (e.g. 'Phases / Units', 'Final Prep')" },
                        order: { type: Type.INTEGER, description: "Order sequence of phase" },
                        subtasks: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              title: { type: Type.STRING, description: "Subtask task title" },
                              duration_minutes: { type: Type.INTEGER, description: "Estimated duration in minutes" }
                            },
                            required: ["title", "duration_minutes"]
                          }
                        }
                      },
                      required: ["title", "order", "subtasks"]
                    }
                  },
                  reasoning: { type: Type.STRING },
                },
                required: ["action", "reasoning"],
              },
            },
             message: { type: Type.STRING, description: "A short friendly summary of all changes made, any suggested goals, and clarifying questions if needed" },
             clarificationNeeded: { type: Type.BOOLEAN, description: "True if AI needs more info from user (e.g. missing room numbers, or when a user enters an open-ended task/plan request that requires custom questions)" },
             clarificationQuestions: {
               type: Type.ARRAY,
               description: "Interactive setup questions to render in a questionnaire wizard if clarificationNeeded is true",
               items: {
                 type: Type.OBJECT,
                 properties: {
                   id: { type: Type.STRING, description: "Unique question id (e.g. 'project_type', 'session_count')" },
                   label: { type: Type.STRING, description: "User-facing question text" },
                   type: { type: Type.STRING, description: "Input type: 'select', 'text', or 'task_list'" },
                   options: {
                     type: Type.ARRAY,
                     items: { type: Type.STRING },
                     description: "Options array if type is select"
                   },
                   placeholder: { type: Type.STRING, description: "Placeholder text if type is text" }
                 },
                 required: ["id", "label", "type"]
               }
             }
           },
           required: ["changes", "message"],
        },
      },
    });
    console.log(`[AI] gemini inference: ${(performance.now() - t1).toFixed(2)}ms`);

    const t2 = performance.now();
    const outputText = response.text;
    if (!outputText) throw new Error("Empty response from model");
    const result = JSON.parse(outputText.trim());
    console.log(`[AI] parse overhead: ${(performance.now() - t2).toFixed(2)}ms`);
    
    res.json(result);
  } catch (error: any) {
    console.error("Schedule Adjust Error:", error);
    handleApiError(res, error, "Failed to process schedule changes.");
  }
});

// 3.4. Micro-Coach API — cheap endpoint for motivational nudges and friction coaching
app.post("/api/micro-coach", async (req, res) => {
  try {
    const { userText, behaviorSignals } = req.body;
    if (!userText || typeof userText !== "string") {
       return res.status(400).json({ error: "userText required" });
    }

    const systemPrompt = `You are DayFlow's micro-coach.
Your job is to provide short, punchy (1-3 sentences) behavioral coaching, motivation, or friction-busting advice.
Do not output JSON. Do not schedule tasks. Just reply with plain text.
Be warm, direct, and empathetic.
Recent behavior signals: ${behaviorSignals || "(none)"}`;

    const t0 = performance.now();
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-8b",
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

    const systemPrompt = `You are DayFlow's conversational assistant.
Your job is to answer general questions, offer advice, or explain scheduling decisions.
Do not output JSON. Reply with conversational Markdown.
Current schedule summary:
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



// 5. Unified AI Reasoning API Route
app.post("/api/ai-reasoning", async (req, res) => {
  try {
    const { trigger, context, userMessage } = req.body;
    if (!trigger) {
      res.status(400).json({ error: "trigger type is required" });
      return;
    }

    const systemPrompt = `You are DayFlow, an intelligent, narrow behavioral scheduling coach.
You have ONLY 4 jobs:
1. Parse messy input: Convert messy user statements ("wasted 3 hours doomscrolling") into structured changes (e.g. log friction, delay, or park tasks).
2. Explain suggestions: Provide a brief, evidence-based reason when a user clicks "Why?" or asks for schedule suggestions.
3. Reflection coaching: Conduct the evening check-in review Conversational flow.
4. Decompose vague tasks: Break large/vague tasks (>120 mins, carryover >= 3, or unclear tasks) into exactly 3 bite-sized concrete steps.

You are NOT a general conversational assistant or general life coach. Do not answer questions outside of tasks, schedule logs, friction points, task decomposition, and reflections.

## Trigger Modes
1. "reflection": User is reflecting on yesterday or recent stale tasks.
   - Use staleTasksCount, burnoutRisk, procrastinationRisk from signals.
   - Propose resolutions: carry_over (recoverable tasks), expire (non-recoverable), backlog (low urgency).
   - If goalImpact is present, acknowledge the goal delay in your message.
2. "drift": A task has been missed today. Check in softly.
   - Use missedTask, todayLoadMins, overloadRisk from currentState.
   - Propose: delay, carry_over, backlog depending on load.
3. "copilot": User is chatting with you. Provide coach-like feedback strictly regarding their timeline and execution psychology.

## Proposal Actions
- { "type": "carry_over", "taskId": "..." } — move to today
- { "type": "backlog", "taskId": "..." } — park for later
- { "type": "expire", "taskId": "..." } — mark as expired (non-recoverable only)
- { "type": "suggest", "message": "..." } — coaching suggestion, no task change
- { "type": "ask", "question": "..." } — clarifying question before acting
- { "type": "abstain", "reason": "..." } — use when signals are conflicting or insufficient

## proposalRisk
- "low": simple carry-overs, minor adjustments — auto-applied
- "medium" or "high": expiring important tasks, large changes — require user confirmation

Respond ONLY with a valid JSON object. No markdown, no backticks, no commentary.`;

    // V3.1 Payload logging
    const reasoningPayload = JSON.stringify({ trigger, context });
    const reasoningBytes = reasoningPayload.length;
    console.log(`[AI] /api/ai-reasoning payload: ${reasoningBytes} bytes (target <8KB = ${reasoningBytes < 8192 ? '✓ OK' : '⚠ OVER'})`);

    const ai = getGeminiClient();
    const userPayload = `Trigger: "${trigger}"
User Message: "${userMessage || ''}"
Context: ${JSON.stringify(context || {})}

Generate the AIProposal response JSON:`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPayload,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            proposalRisk: { type: Type.STRING, enum: ["low", "medium", "high"] },
            proposals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["carry_over", "backlog", "expire", "suggest", "ask", "abstain"] },
                  taskId: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["type", "reason"]
              }
            }
          },
          required: ["message", "proposalRisk", "proposals"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response received from AI reasoning model");
    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("AI reasoning API error:", error);
    handleApiError(res, error, "Failed to perform AI reasoning.");
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

if (!process.env.VERCEL) {
  startServer();
}

export default app;
