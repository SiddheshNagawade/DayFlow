import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: "Make me a schedule for today." }],
      config: {
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
                   type: { type: Type.STRING, description: "Input type: 'select' or 'text'" },
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
    console.log("Success:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
