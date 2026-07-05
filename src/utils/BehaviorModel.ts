import { FlexibleTask, BehaviorSignals } from "../types";
import { getTaskCategory } from "./mlEngine";

// Matrix transpose helper
function transpose(A: number[][]): number[][] {
  const m = A.length;
  const n = A[0].length;
  const AT: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      AT[j][i] = A[i][j];
    }
  }
  return AT;
}

// Matrix multiplication helper
function multiply(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const n = A[0].length;
  const p = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array(p).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += A[i][k] * B[k][j];
      }
      C[i][j] = sum;
    }
  }
  return C;
}

// Gauss-Jordan elimination for matrix inversion with partial pivoting
function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length;
  // Create identity matrix
  const I: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
  // Clone A to modify
  const temp = A.map(row => [...row]);

  for (let i = 0; i < n; i++) {
    // Pivot selection
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(temp[k][i]) > Math.abs(temp[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows in temp and I
    const tRow = temp[i];
    temp[i] = temp[maxRow];
    temp[maxRow] = tRow;

    const iRow = I[i];
    I[i] = I[maxRow];
    I[maxRow] = iRow;

    // Check singularity
    const pivot = temp[i][i];
    if (Math.abs(pivot) < 1e-9) {
      return null; // Matrix is singular or unstable to invert
    }

    // Normalize pivot row
    for (let j = 0; j < n; j++) {
      temp[i][j] /= pivot;
      I[i][j] /= pivot;
    }

    // Eliminate column elements
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = temp[k][i];
      for (let j = 0; j < n; j++) {
        temp[k][j] -= factor * temp[i][j];
        I[k][j] -= factor * I[i][j];
      }
    }
  }
  return I;
}

export interface TrainedModelWeights {
  classifierWeights: number[];
  regressorWeights: number[];
  meanAbsoluteError: number;
  modelActive: boolean;
  trainingSamples: number;
}

// Category map to integer index
const CATEGORY_MAP: Record<string, number> = {
  work: 0,
  exercise: 1,
  relax: 2,
  personal: 3
};

// Map task energy level to continuous value
function getContinuousEnergy(level?: string): number {
  if (level === "high") return 0.85;
  if (level === "low") return 0.25;
  return 0.50; // medium / fallback
}

/**
 * Feature Extractor: Maps a task context to a 15-dimensional vector:
 * 0: Intercept (1.0)
 * 1: Planned duration (log-scaled)
 * 2: Category: Work (0 or 1)
 * 3: Category: Exercise (0 or 1)
 * 4: Category: Relax (0 or 1)
 * 5: Category: Personal (0 or 1)
 * 6: Cyclic Hour Sin
 * 7: Cyclic Hour Cos
 * 8: Cyclic Weekday Sin
 * 9: Cyclic Weekday Cos
 * 10: Peak Energy Score (continuous 0-1)
 * 11: Complexity (0-1)
 * 12: Carry-over count
 * 13: Reschedule/Interruption count
 * 14: Rolling historical planning bias
 */
export function extractFeatures(task: FlexibleTask, signals?: BehaviorSignals): number[] {
  const x = new Array(15).fill(0);
  x[0] = 1.0; // Intercept

  // 1. Duration (log scale to bound large tasks)
  x[1] = Math.log(Math.max(5, task.duration_minutes)) / 5.0;

  // 2-5. Categories (one-hot)
  const cat = task.category || getTaskCategory(task.title);
  const catIdx = CATEGORY_MAP[cat] ?? 3; // default to personal
  x[2 + catIdx] = 1.0;

  // Extract date and time metadata
  let hour = 12; // default
  let dayOfWeek = 3; // default Thursday

  if (task.pinned_start_time) {
    const [h, m] = task.pinned_start_time.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) hour = h + m / 60;
  } else if (task.scheduled_start_time) {
    const [h, m] = task.scheduled_start_time.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) hour = h + m / 60;
  }

  const dateStr = task.scheduled_date || new Date().toISOString().split("T")[0];
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    dayOfWeek = d.getUTCDay();
  }

  // 6-7. Cyclic Hour
  const hourAngle = (2.0 * Math.PI * hour) / 24.0;
  x[6] = Math.sin(hourAngle);
  x[7] = Math.cos(hourAngle);

  // 8-9. Cyclic Weekday
  const dayAngle = (2.0 * Math.PI * dayOfWeek) / 7.0;
  x[8] = Math.sin(dayAngle);
  x[9] = Math.cos(dayAngle);

  // 10. Energy Peak Score
  let peakScore = getContinuousEnergy(task.energy_level);
  if (signals?.hourlySuccessMap) {
    const hourInt = Math.floor(hour);
    const hourlyData = signals.hourlySuccessMap[hourInt];
    if (hourlyData && hourlyData.supportCount >= 2) {
      peakScore = hourlyData.rate / 100;
    }
  }
  x[10] = peakScore;

  // 11. Complexity
  x[11] = (task.complexity || 5) / 10.0;

  // 12. Carry over count
  x[12] = task.carry_over_count || 0;

  // 13. Reschedule / postponement count (derived from carry-over + delay log counts)
  x[13] = (task.carry_over_count || 0) + (task.delay_count || 0);

  // 14. Historical rolling planning bias
  x[14] = signals?.planningBias?.value || 1.0;

  return x;
}

export const FEATURE_NAMES = [
  "Intercept",
  "Task Length",
  "Category: Work",
  "Category: Exercise",
  "Category: Relax",
  "Category: Personal",
  "Cyclic Hour (Sin)",
  "Cyclic Hour (Cos)",
  "Cyclic Weekday (Sin)",
  "Cyclic Weekday (Cos)",
  "Energy Mismatch",
  "Complexity Score",
  "Carry-over Count",
  "Postpone / Reschedule Count",
  "Historical Planning Bias"
];

// Helper to map index to human friendly reasons
export function getFriendlyAttributionReason(featureIdx: number, value: number): string {
  switch (featureIdx) {
    case 1:
      return "Task is longer than average for this category";
    case 2:
    case 3:
    case 4:
    case 5:
      return "General category execution patterns";
    case 6:
    case 7:
      return value < 0
        ? "Time slot usually has lower completion rates"
        : "Scheduled outside peak productivity hours";
    case 8:
    case 9:
      return "Historical weekday load levels";
    case 10:
      return "Scheduled outside your peak energy windows";
    case 11:
      return "Task complexity is higher than average";
    case 12:
    case 13:
      return "Task has been carried over/rescheduled multiple times";
    case 14:
      return "Historical estimation bias";
    default:
      return "General schedule overload patterns";
  }
}

// Sigmoid helper
function sigmoid(z: number): number {
  return 1.0 / (1.0 + Math.exp(-z));
}

/**
 * Train Classifier (Logistic Regression) & Regressor (Ridge Regression)
 */
export function trainBehavioralModel(
  tasks: FlexibleTask[],
  signals?: BehaviorSignals
): TrainedModelWeights {
  const defaultModel: TrainedModelWeights = {
    classifierWeights: new Array(15).fill(0),
    regressorWeights: new Array(15).fill(0),
    meanAbsoluteError: 0,
    modelActive: false,
    trainingSamples: 0
  };

  const resolved = tasks.filter(t => t.status === "done" || t.status === "skipped" || t.status === "expired");
  const completedCount = tasks.filter(t => t.status === "done").length;

  if (resolved.length < 50) {
    return defaultModel;
  }

  // 1. Feature Matrices Preparation
  const numFeatures = 15;
  const X_class: number[][] = [];
  const y_class: number[] = [];

  const X_reg: number[][] = [];
  const y_reg: number[] = [];

  resolved.forEach(t => {
    const xVec = extractFeatures(t, signals);
    const isCompleted = t.status === "done";

    // For Classifier: all resolved tasks (1 = completed, 0 = skipped/expired)
    X_class.push(xVec);
    y_class.push(isCompleted ? 1.0 : 0.0);

    // For Regressor: completed tasks with a valid duration multiplier
    if (isCompleted && t.duration_minutes > 0 && t.actual_duration_minutes !== undefined) {
      const mult = t.actual_duration_minutes / t.duration_minutes;
      // Filter outliers to learn focused work (multiplier between 0.3 and 3.0)
      if (mult >= 0.3 && mult <= 3.0) {
        X_reg.push(xVec);
        y_reg.push(mult);
      }
    }
  });

  // Check data density
  if (X_class.length < 50 || X_reg.length < 25) {
    return defaultModel;
  }

  // --- TRAIN MODEL A: Logistic Regression via Gradient Descent ---
  const w_c = new Array(numFeatures).fill(0);
  const lr = 0.05;
  const epochs = 150;

  for (let step = 0; step < epochs; step++) {
    const gradients = new Array(numFeatures).fill(0);
    for (let i = 0; i < X_class.length; i++) {
      const xi = X_class[i];
      let dot = 0;
      for (let j = 0; j < numFeatures; j++) {
        dot += w_c[j] * xi[j];
      }
      const pred = sigmoid(dot);
      const err = pred - y_class[i];
      for (let j = 0; j < numFeatures; j++) {
        gradients[j] += err * xi[j];
      }
    }
    // Update weights with small L2 weight decay to stabilize
    for (let j = 0; j < numFeatures; j++) {
      w_c[j] -= lr * (gradients[j] / X_class.length + 0.01 * w_c[j]);
    }
  }

  // --- TRAIN MODEL B: Ridge Regression via Analytical Inversion ---
  // w = (X^T * X + lambda * I)^-1 * X^T * y
  const lambda = 1.5;
  
  // Compute X^T
  const XT = transpose(X_reg);
  
  // Compute X^T * X
  const XTX = multiply(XT, X_reg);
  
  // Add lambda * I to X^T * X
  for (let i = 0; i < numFeatures; i++) {
    XTX[i][i] += lambda;
  }

  // Invert (X^T * X + lambda * I)
  const invXTX = invertMatrix(XTX);
  if (!invXTX) {
    return defaultModel;
  }

  // Compute X^T * y
  const XTy: number[][] = Array.from({ length: numFeatures }, () => [0]);
  for (let i = 0; i < numFeatures; i++) {
    let sum = 0;
    for (let j = 0; j < X_reg.length; j++) {
      sum += XT[i][j] * y_reg[j];
    }
    XTy[i][0] = sum;
  }

  // Compute w = invXTX * XTy
  const w_r_matrix = multiply(invXTX, XTy);
  const w_r = w_r_matrix.map(row => row[0]);

  // --- VALIDATION ERROR CHECK (MAE) ---
  let absErrorSum = 0;
  for (let i = 0; i < X_reg.length; i++) {
    const xi = X_reg[i];
    let predMultiplier = 0;
    for (let j = 0; j < numFeatures; j++) {
      predMultiplier += w_r[j] * xi[j];
    }
    absErrorSum += Math.abs(y_reg[i] - predMultiplier);
  }
  const mae = absErrorSum / X_reg.length;

  // Gating Condition: Active only if completed count >= 50 AND MAE is acceptable
  const modelActive = completedCount >= 50 && mae < 0.45;

  return {
    classifierWeights: w_c,
    regressorWeights: w_r,
    meanAbsoluteError: Math.round(mae * 100) / 100,
    modelActive,
    trainingSamples: completedCount
  };
}

/**
 * Predict completion probability and calculate feature attributions (SHAP-like)
 */
export interface PredictionResult {
  probability: number;
  leadingAttributionIdx: number;
  leadingAttributionValue: number;
  leadingReason: string;
}

export function predictCompletion(
  task: FlexibleTask,
  model: TrainedModelWeights,
  signals?: BehaviorSignals
): PredictionResult {
  if (!model.modelActive) {
    return {
      probability: 0.85, // smart default baseline
      leadingAttributionIdx: -1,
      leadingAttributionValue: 0,
      leadingReason: ""
    };
  }

  const xVec = extractFeatures(task, signals);
  const numFeatures = xVec.length;

  let dot = 0;
  for (let i = 0; i < numFeatures; i++) {
    dot += model.classifierWeights[i] * xVec[i];
  }
  const prob = sigmoid(dot);

  // Find the single feature with the strongest negative contribution to success
  let minContrib = 0;
  let minIdx = -1;
  let minVal = 0;

  for (let i = 1; i < numFeatures; i++) { // skip intercept
    const contrib = model.classifierWeights[i] * xVec[i];
    if (contrib < minContrib) {
      minContrib = contrib;
      minIdx = i;
      minVal = xVec[i];
    }
  }

  const leadingReason = minIdx !== -1 
    ? getFriendlyAttributionReason(minIdx, minVal) 
    : "General schedule overload patterns";

  return {
    probability: prob,
    leadingAttributionIdx: minIdx,
    leadingAttributionValue: minContrib,
    leadingReason
  };
}

/**
 * Predict duration multiplier
 */
export function predictDurationMultiplier(
  task: FlexibleTask,
  model: TrainedModelWeights,
  signals?: BehaviorSignals
): number {
  if (!model.modelActive) {
    return 1.0; // fallback
  }

  const xVec = extractFeatures(task, signals);
  const numFeatures = xVec.length;

  let multiplier = 0;
  for (let i = 0; i < numFeatures; i++) {
    multiplier += model.regressorWeights[i] * xVec[i];
  }

  // Constrain predictions to safe bounds [0.5, 2.5]
  return Math.max(0.5, Math.min(2.5, multiplier));
}

export interface BehaviorModelResult {
  duration: number;
  completionProbability: number;
  suggestedIntervention?: {
    type: "DECOMPOSE" | "SHIFT_TO_PEAK" | "SHRINK";
    reason: string;
  };
  confidence: number;
  modelActive: boolean;
}

export class BehaviorModel {
  static predict(
    task: FlexibleTask,
    activeProfile: any,
    model: TrainedModelWeights,
    signals?: BehaviorSignals
  ): BehaviorModelResult {
    // 1. Duration Predictor (Ridge Regression / Category average fallback)
    let duration = task.duration_minutes;
    if (model.modelActive) {
      const mult = predictDurationMultiplier(task, model, signals);
      duration = Math.round(task.duration_minutes * mult);
    } else {
      const cat = task.category || getTaskCategory(task.title);
      let factor = 1.0;
      if (activeProfile.phase === 2 && activeProfile.multipliers) {
        factor = activeProfile.multipliers[cat] || 1.0;
      } else if (activeProfile.phase === 1) {
        factor = activeProfile.underestimateRatio || 1.0;
      }
      duration = Math.round(task.duration_minutes * factor);
    }
    duration = Math.max(15, Math.min(240, duration));

    // 2. Completion Predictor & Intervention / Explanation Generator
    let completionProbability = 0.85;
    let suggestedIntervention: BehaviorModelResult["suggestedIntervention"] = undefined;

    if (model.modelActive) {
      const probRes = predictCompletion(task, model, signals);
      completionProbability = probRes.probability;

      // 3. Rule Engine / Intervention Selection (No direct overtrust of classifier)
      if (probRes.probability < 0.40) {
        const isCritical = 
          task.meta?.importance === "critical" || 
          task.meta?.deadline_pressure === "critical" || 
          task.meta?.deadline_pressure === "high";

        if (isCritical) {
          suggestedIntervention = {
            type: "SHRINK",
            reason: "High priority task. Protect execution by shortening other secondary tasks."
          };
        } else if (probRes.leadingAttributionIdx === 6 || probRes.leadingAttributionIdx === 7 || probRes.leadingAttributionIdx === 10) {
          suggestedIntervention = {
            type: "SHIFT_TO_PEAK",
            reason: "Scheduled outside your peak focus times. Move to your next high-focus window?"
          };
        } else if (probRes.leadingAttributionIdx === 1) {
          suggestedIntervention = {
            type: "SHRINK",
            reason: "Predicted to run long based on history. Consider shortening."
          };
        } else {
          suggestedIntervention = {
            type: "DECOMPOSE",
            reason: "This task has been carried over multiple times. Suggest breaking it down."
          };
        }
      }
    }

    return {
      duration,
      completionProbability,
      suggestedIntervention,
      confidence: model.modelActive ? Math.max(0, Math.round((1 - model.meanAbsoluteError) * 100) / 100) : 0,
      modelActive: model.modelActive
    };
  }

  static predictEnergyScore(task: FlexibleTask, signals?: BehaviorSignals): number {
    const category = task.category || getTaskCategory(task.title);
    let score = 0.5;

    if (category === "work") score = 0.8;
    else if (category === "exercise") score = 0.7;
    else if (category === "relax") score = 0.2;
    else if (category === "personal") score = 0.4;

    if (task.complexity) {
      score += (task.complexity - 5) * 0.05;
    }
    if (task.importance === "critical") score += 0.1;
    if (task.importance === "optional") score -= 0.15;

    if (signals) {
      if (signals.procrastinationRisk && signals.procrastinationRisk.value > 0.6) {
        score += 0.15;
      }
      if (signals.burnoutRisk && signals.burnoutRisk.value > 0.6) {
        score += 0.1;
      }
    }

    return Math.max(0.1, Math.min(1.0, score));
  }

  static predictDurationRange(
    task: FlexibleTask,
    activeProfile: any,
    model: TrainedModelWeights,
    signals?: BehaviorSignals
  ): { min: number; max: number } {
    const predicted = this.predict(task, activeProfile, model, signals).duration;
    const complexity = task.complexity || 5;
    const varianceFactor = 0.1 + (complexity * 0.03);
    const min = Math.max(15, Math.round(predicted * (1 - varianceFactor)));
    const max = Math.max(min + 15, Math.round(predicted * (1 + varianceFactor * 1.5)));
    return { min, max };
  }
}
