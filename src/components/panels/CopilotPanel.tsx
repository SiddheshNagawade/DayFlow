import React from "react";
import { 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  X, 
  AlertTriangle, 
  RotateCcw, 
  Pencil, 
  Clock, 
  Check, 
  Plus, 
  Moon, 
  Upload, 
  Mic,
  Send,
  Trash2
} from "lucide-react";
import { FlexibleTask, ChatMessage } from "../../types";

interface CopilotTextAreaProps {
  value: string;
  onSend: (text: string) => void;
  placeholder: string;
  disabled: boolean;
  isProcessing: boolean;
}

const CopilotTextArea: React.FC<CopilotTextAreaProps> = ({
  value,
  onSend,
  placeholder,
  disabled,
  isProcessing
}) => {
  const [localVal, setLocalVal] = React.useState(value);

  React.useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isProcessing && localVal.trim()) {
        onSend(localVal);
        setLocalVal("");
      }
    }
  };

  return (
    <div className="relative w-full flex items-center">
      <textarea 
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        className="w-full pl-4 pr-14 py-3 text-xs focus:outline-none resize-none font-sans font-medium bg-[var(--bg-card)] border border-[var(--border-strong)] dark:gemini-input-capsule dark:text-[var(--text-primary)]"
        disabled={disabled}
      />
      {localVal.trim().length > 0 && !disabled && !isProcessing && (
        <button
          onClick={() => {
            onSend(localVal);
            setLocalVal("");
          }}
          className="absolute right-2 p-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm z-10 cursor-pointer flex items-center justify-center h-8 w-8"
          title="Send Message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isProcessingCopilot: boolean;
  copilotMinimized: boolean;
  setCopilotMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  handleResetCopilotChat: () => void;
  handleSendCopilotMessage: (text: string, historyOverride?: ChatMessage[]) => void;
  copilotInput: string;
  setCopilotInput: (val: string) => void;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  copilotError: string | null;
  setCopilotError: (err: string | null) => void;
  handleTriggerOfflineFallback: () => void;
  editingMessageIdx: number | null;
  setEditingMessageIdx: React.Dispatch<React.SetStateAction<number | null>>;
  editingMessageText: string;
  setEditingMessageText: React.Dispatch<React.SetStateAction<string>>;
  flexibleTasks: FlexibleTask[];
  handleEveningCheckinSelect: (action: string, taskId: string | null, messageIdx: number) => void;
  handleLogDuration: (taskId: string, minutes: number, source: string, confidence: number) => void;
  formatMinutes: (minutes: number) => string;
  profileName: string;
  daySchedule: any;
  proposedChanges: any[] | null;
  setProposedChanges: React.Dispatch<React.SetStateAction<any[] | null>>;
  copilotImage: any;
  setCopilotImage: React.Dispatch<React.SetStateAction<any>>;
  copilotImageInputRef: React.RefObject<HTMLInputElement>;
  speechSupported: boolean;
  isListening: boolean;
  handleVoiceInput: () => void;
  copilotRetryAttempt: number;
  copilotLoadingPhase: string;
  handleStopCopilot: () => void;
  handleConfirmAIChanges: () => void;
  handleSubmitQuestionnaire: (idx: number) => void;
  handleDecomposeTaskConfirm: (taskId: string, messageIdx: number) => void;
  handleDecomposeTaskCancel: (messageIdx: number) => void;
  isUnimportantTask: (title: string, meta: any) => boolean;
}

export const CopilotPanel: React.FC<CopilotPanelProps> = React.memo(({
  isOpen,
  onClose,
  chatHistory,
  setChatHistory,
  isProcessingCopilot,
  copilotMinimized,
  setCopilotMinimized,
  handleResetCopilotChat,
  handleSendCopilotMessage,
  copilotInput,
  setCopilotInput,
  chatContainerRef,
  copilotError,
  setCopilotError,
  handleTriggerOfflineFallback,
  editingMessageIdx,
  setEditingMessageIdx,
  editingMessageText,
  setEditingMessageText,
  flexibleTasks,
  handleEveningCheckinSelect,
  handleLogDuration,
  formatMinutes,
  profileName,
  daySchedule,
  proposedChanges,
  setProposedChanges,
  copilotImage,
  setCopilotImage,
  copilotImageInputRef,
  speechSupported,
  isListening,
  handleVoiceInput,
  copilotRetryAttempt,
  copilotLoadingPhase,
  handleStopCopilot,
  handleConfirmAIChanges,
  handleSubmitQuestionnaire,
  handleDecomposeTaskConfirm,
  handleDecomposeTaskCancel,
  isUnimportantTask
}) => {
  const userPromptsCount = chatHistory.filter(m => m.sender === "user").length;
  const isCopilotFullScreen = userPromptsCount >= 3 && !copilotMinimized;

  return (
    <div 
      className={`fixed z-[100] bg-white dark:bg-[var(--bg-card)] transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${ isOpen ? "opacity-100 pointer-events-auto translate-x-0 md:translate-x-0" : "opacity-0 pointer-events-none invisible translate-y-10 md:translate-y-0 md:translate-x-full" } ${ isCopilotFullScreen ? "top-0 bottom-0 left-0 right-0 w-full h-full max-h-screen md:max-w-3xl md:left-auto md:right-0 md:top-0 md:bottom-0 md:h-screen md:rounded-l-3xl md:rounded-r-none border border-neutral-200 dark:border-[var(--border)]/80 shadow-2xl p-6" : "bottom-0 left-0 right-0 max-h-[90vh] md:max-h-screen md:h-screen md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-[380px] md:max-w-md md:rounded-l-3xl md:rounded-r-none border border-neutral-200 dark:border-[var(--border)]/80 shadow-2xl p-6 transform " + (isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full") }`}
    >
      {!isCopilotFullScreen && (
        <div className="flex justify-center pb-3">
          <span className="w-10 h-1 bg-neutral-200 dark:bg-[var(--bg-card-hover)] rounded-full" />
        </div>
      )}
      
      <div className="flex flex-col h-full overflow-hidden text-left bg-white dark:bg-[var(--bg-card)] p-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-2 border-b border-[var(--border-strong)] dark:border-[var(--border)]/40 pb-3 flex-shrink-0">
          <h3 className="font-display font-semibold text-sm md:text-base text-[#0F172A] flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary fill-primary/10 shrink-0" />
            <span>Day Coach</span>
            {isCopilotFullScreen && (
              <span className="text-[10px] bg-indigo-50 text-primary font-bold px-2 py-0.5 rounded-full ml-1 font-display">
                Expanded
              </span>
            )}
          </h3>
          
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* Minimize / Expand Toggle */}
            {userPromptsCount >= 3 && (
              <button
                type="button"
                onClick={() => setCopilotMinimized(prev => !prev)}
                className="px-2 py-1 text-[10px] font-bold border border-[var(--border-strong)] dark:border-[var(--border)] text-neutral-550 dark:text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 duration-200"
                title={copilotMinimized ? "Expand chat view" : "Minimize chat view"}
              >
                {copilotMinimized ? (
                  <>
                    <Maximize2 className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span className="hidden sm:inline">Expand</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span className="hidden sm:inline">Minimize</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleResetCopilotChat}
              className="px-2 py-1 text-[10px] font-bold border border-[var(--border-strong)] dark:border-[var(--border)] text-neutral-550 dark:text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 duration-200 disabled:opacity-50"
              title="Reset chat context"
            >
              <RefreshCw className="w-3 h-3 text-[var(--text-tertiary)] group-hover:rotate-180 transition-transform" />
              <span>Reset</span>
            </button>
            
            <button
              type="button"
              onClick={() => handleSendCopilotMessage("Summarize my day and plan tomorrow")}
              disabled={isProcessingCopilot}
              className="px-2.5 py-1 text-[10px] md:text-xs font-bold bg-gradient-to-r from-primary to-indigo-650 hover:from-primary-dark hover:to-indigo-700 text-white rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 duration-200 disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-primary/10"
              title="Summarize my day and plan tomorrow"
            >
              <Sparkles className="w-3 h-3 fill-white/10 animate-pulse" />
              <span>Summarize & Plan</span>
            </button>

            {/* Exit/Close Chat button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-neutral-555 hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] cursor-pointer active:scale-95 duration-200 shrink-0 ml-1"
              title="Close Copilot"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="space-y-5 flex-1 flex flex-col min-h-0">
          {/* Copilot Chat Message Area */}
          <div ref={chatContainerRef} className="space-y-3 flex-1 overflow-y-auto pr-1 flex flex-col min-h-0 scrollbar-thin">
            {copilotError && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200/60 rounded-2xl text-xs text-amber-900 flex flex-col gap-2 animate-fade-in text-left shadow-xs">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Troubleshooting Assistant</span>
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">{copilotError}</p>
                <div className="flex items-center gap-3 mt-1 pt-1.5 border-t border-amber-200/50">
                  <button
                    type="button"
                    onClick={() => setCopilotError(null)}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-850 cursor-pointer"
                  >
                    Dismiss Notice
                  </button>
                  <span className="text-amber-300 text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={handleResetCopilotChat}
                    className="text-[10px] font-bold text-primary hover:text-primary-dark cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Reset AI Chat
                  </button>
                  {copilotError.indexOf("stopped") === -1 && copilotError.indexOf("cancelled") === -1 && (
                    <>
                      <span className="text-amber-300 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={handleTriggerOfflineFallback}
                        className="text-[10px] font-bold text-[#D97706] hover:text-amber-850 cursor-pointer flex items-center gap-1"
                      >
                        Use Offline Fallback
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {chatHistory.map((msg, idx) => {
              const isAI = msg.sender === "ai";
              const isEditingThis = editingMessageIdx === idx;
              
              return (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[85%] group/msg relative ${isAI ? "self-start" : "self-end ml-auto"}`}
                >
                  {isEditingThis ? (
                    <div className="p-3 bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF] rounded-2xl shadow-sm space-y-2 w-full text-left">
                      <textarea
                        value={editingMessageText}
                        onChange={(e) => setEditingMessageText(e.target.value)}
                        className="w-full p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:outline-none focus:ring-1 focus:ring-primary font-sans resize-none text-slate-800 dark:text-[var(--text-primary)]"
                        rows={2}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingMessageIdx(null)}
                          className="px-2 py-1 text-[10px] font-bold border border-[var(--border-strong)] dark:border-[var(--border)] text-neutral-550 dark:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHistory = chatHistory.slice(0, idx);
                            setEditingMessageIdx(null);
                            handleSendCopilotMessage(editingMessageText, updatedHistory);
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold bg-primary text-white rounded-lg hover:bg-primary-dark cursor-pointer"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div 
                        className={`text-xs leading-relaxed ${ isAI ? "p-3.5 bg-[#F6F5FF] border border-[#E0D9FF] text-[#1F2937] rounded-xl font-medium shadow-none text-left dark:msg-model dark:border-transparent" : "p-3.5 bg-primary text-white rounded-xl font-semibold shadow-[0_2px_4px_rgba(79,70,229,0.2)] text-left dark:msg-user dark:shadow-none" }`}
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {msg.text}
                      </div>
                      
                      {!isAI && !isProcessingCopilot && (
                        <div className="absolute -left-9 sm:-left-[4.5rem] top-1/2 -translate-y-1/2 flex flex-col sm:flex-row items-center gap-1.5 opacity-70 md:opacity-0 group-hover/msg:opacity-100 transition-opacity z-10">
                          <button
                            type="button"
                            onClick={() => {
                              const updatedHistory = chatHistory.slice(0, idx);
                              handleSendCopilotMessage(msg.text, updatedHistory);
                            }}
                            className="p-1.5 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-neutral-450 dark:text-[var(--text-secondary)] hover:text-primary cursor-pointer shadow-3xs"
                            title="Retry message"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageIdx(idx);
                              setEditingMessageText(msg.text);
                            }}
                            className="p-1.5 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-neutral-450 dark:text-[var(--text-secondary)] hover:text-neutral-650 dark:text-[var(--text-primary)] cursor-pointer shadow-3xs"
                            title="Edit message"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      
                      {/* Duration confirmation inline chip */}
                      {msg.durationConfirmation && (
                        <div className="mt-3 bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF] rounded-2xl p-4 shadow-xs space-y-3 text-left text-slate-800 dark:text-[var(--text-primary)] w-full min-w-[260px] animate-fade-in">
                          {!msg.durationConfirmation.isResolved ? (
                            <>
                              <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
                                <Clock className="w-3.5 h-3.5 fill-primary/10 text-primary" />
                                <span>Time Track Proposal</span>
                              </div>
                              <h5 className="text-xs font-semibold text-neutral-805 leading-tight">
                                Log <strong className="text-primary font-bold">{formatMinutes(msg.durationConfirmation.proposedDurationMinutes)}</strong> for <strong className="text-slate-905">{msg.durationConfirmation.taskTitle}</strong>?
                              </h5>

                              {msg.durationConfirmation.isEditing ? (
                                <div className="space-y-3 pt-1">
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="number"
                                      value={msg.durationConfirmation.tempDuration ?? msg.durationConfirmation.proposedDurationMinutes}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        const updated = [...chatHistory];
                                        updated[idx].durationConfirmation.tempDuration = val;
                                        setChatHistory(updated);
                                      }}
                                      className="w-20 p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] text-neutral-705 text-center font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                                      placeholder="Mins"
                                    />
                                    <span className="text-xs text-neutral-550 dark:text-[var(--text-secondary)] font-medium">minutes</span>
                                  </div>
                                  <div className="flex gap-2 pt-2 border-t border-[var(--border)] dark:border-[var(--border)]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...chatHistory];
                                        updated[idx].durationConfirmation.isEditing = false;
                                        setChatHistory(updated);
                                      }}
                                      className="flex-1 py-1.5 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-bold border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-[11px] font-display transition-colors cursor-pointer text-center"
                                    >
                                      Back
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const mins = msg.durationConfirmation.tempDuration ?? msg.durationConfirmation.proposedDurationMinutes;
                                        handleLogDuration(msg.durationConfirmation.taskId, mins, "message", 0.8);
                                        const updated = [...chatHistory];
                                        updated[idx].durationConfirmation.isResolved = true;
                                        updated[idx].durationConfirmation.resolvedAction = "edit";
                                        updated[idx].durationConfirmation.resolvedMins = mins;
                                        setChatHistory(updated);
                                      }}
                                      className="flex-1 py-1.5 bg-primary-gradient hover:opacity-90 text-white font-bold rounded-xl text-[11px] font-display transition-all shadow-sm shadow-primary/20 cursor-pointer text-center"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2 pt-2 border-t border-[var(--border)] dark:border-[var(--border)]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleLogDuration(
                                        msg.durationConfirmation.taskId,
                                        msg.durationConfirmation.proposedDurationMinutes,
                                        "message",
                                        msg.durationConfirmation.confidence || 0.8
                                      );
                                      const updated = [...chatHistory];
                                      updated[idx].durationConfirmation.isResolved = true;
                                      updated[idx].durationConfirmation.resolvedAction = "confirm";
                                      setChatHistory(updated);
                                    }}
                                    className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200/60 rounded-xl text-[11px] font-display transition-colors cursor-pointer text-center"
                                  >
                                    ✓ Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...chatHistory];
                                      updated[idx].durationConfirmation.isEditing = true;
                                      setChatHistory(updated);
                                    }}
                                    className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200/60 rounded-xl text-[11px] font-display transition-colors cursor-pointer text-center"
                                  >
                                    ✏ Edit
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-[11px] text-emerald-600 font-extrabold flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl">
                              <Check className="w-3.5 h-3.5 text-emerald-505 shrink-0" />
                              <span>Logged {msg.durationConfirmation.resolvedAction === "edit" ? `${msg.durationConfirmation.resolvedMins} mins` : `${formatMinutes(msg.durationConfirmation.proposedDurationMinutes)}`} for {msg.durationConfirmation.taskTitle}!</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Trust Layer AIActionExplanation log list */}
                      {msg.explanations && msg.explanations.length > 0 && (
                        <div className="mt-3 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-2xl p-4 shadow-xs space-y-3 text-left w-full min-w-[260px] animate-fade-in">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider font-display">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            <span>Action Log & Explanations</span>
                          </div>
                          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {msg.explanations.map((exp, expIdx) => (
                              <div key={expIdx} className="p-2.5 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-neutral-150 dark:border-[var(--border)] rounded-xl space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] leading-tight">
                                    {exp.action}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono inline-block shrink-0 ${ exp.confidence === "low" ? "bg-rose-50 text-rose-600 border border-rose-105" : exp.confidence === "medium" ? "bg-amber-50 text-amber-600 border border-amber-105" : "bg-emerald-50 text-emerald-600 border border-emerald-105" }`}>
                                    {exp.confidence} confidence
                                  </span>
                                </div>
                                <p className="text-[11px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] leading-normal font-medium">{exp.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evening Check-in conversational chips */}
                      {msg.questionnaire && msg.questionnaire.type === "evening_checkin" && !msg.questionnaireSubmitted && (
                        <div className="mt-3 bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF] rounded-2xl p-4 shadow-xs space-y-3 text-left text-slate-800 dark:text-[var(--text-primary)] w-full min-w-[260px] animate-fade-in">
                          <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
                            <Moon className="w-3.5 h-3.5 fill-primary/10 text-primary animate-pulse" />
                            <span>Evening Review</span>
                          </div>
                          
                          {msg.questionnaire.currentStep === "unmarked_completion" && (
                            <div className="space-y-2">
                              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-medium">Did you finish any of these tasks but forget to mark them done?</p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {msg.questionnaire.openTaskIds.map((taskId: string) => {
                                  const task = flexibleTasks.find(t => t.id === taskId);
                                  if (!task) return null;
                                  return (
                                    <button
                                      key={taskId}
                                      type="button"
                                      onClick={() => handleEveningCheckinSelect("finish", taskId, idx)}
                                      className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200/60 rounded-xl text-[10px] cursor-pointer transition-colors"
                                    >
                                      ✓ Finished "{task.title}"
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => handleEveningCheckinSelect("none_finished", null, idx)}
                                  className="py-1.5 px-3 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-bold border border-neutral-250 rounded-xl text-[10px] cursor-pointer transition-colors"
                                >
                                  No, none of these
                                </button>
                              </div>
                            </div>
                          )}

                          {msg.questionnaire.currentStep === "task_reason" && (
                            <div className="space-y-2">
                              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-medium">
                                Why was <strong>"{flexibleTasks.find(t => t.id === msg.questionnaire.activeTaskId)?.title}"</strong> not completed today?
                              </p>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {[
                                  { label: "Too Tired", value: "energy" },
                                  { label: "Wrong Planning", value: "planning" },
                                  { label: "Got Distracted", value: "discipline" },
                                  { label: "Avoided It", value: "interruption" }
                                ].map((r) => (
                                  <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => handleEveningCheckinSelect("reason", r.value, idx)}
                                    className="py-2 px-2 bg-amber-50/70 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200/50 rounded-xl text-[10px] cursor-pointer transition-colors text-center"
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {msg.questionnaire.currentStep === "task_resolution" && (
                            <div className="space-y-2">
                              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-medium">
                                What should we do with <strong>"{flexibleTasks.find(t => t.id === msg.questionnaire.activeTaskId)?.title}"</strong>?
                              </p>
                              <div className="flex flex-col gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleEveningCheckinSelect("resolution", "tomorrow", idx)}
                                  className="py-2 px-3 bg-primary text-white hover:bg-primary-dark font-bold rounded-xl text-[10px] cursor-pointer transition-colors text-center"
                                >
                                  Move to Tomorrow
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEveningCheckinSelect("resolution", "backlog", idx)}
                                  className="py-2 px-3 bg-blue-50 text-blue-750 hover:bg-blue-100 border border-blue-150 font-bold rounded-xl text-[10px] cursor-pointer transition-colors text-center"
                                >
                                  Move to Backlog
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEveningCheckinSelect("resolution", "drop", idx)}
                                  className="py-2 px-3 bg-rose-50 text-rose-750 hover:bg-rose-100 border border-rose-150 font-bold rounded-xl text-[10px] cursor-pointer transition-colors text-center"
                                >
                                  Drop It (Skip)
                                </button>
                              </div>
                            </div>
                          )}

                          {msg.questionnaire.currentStep === "backlog_suggestion" && (
                            <div className="space-y-2">
                              <p className="text-xs text-neutral-650 dark:text-[var(--text-primary)] font-medium">Tomorrow's schedule is set! Should we pull in any of these from backlog?</p>
                              <div className="flex flex-col gap-1.5 pt-1">
                                {flexibleTasks
                                  .filter(t => t.status === "backlog" && !isUnimportantTask(t.title, t.meta))
                                  .slice(0, 3)
                                  .map((task) => (
                                    <button
                                      key={task.id}
                                      type="button"
                                      onClick={() => handleEveningCheckinSelect("pull", task.id, idx)}
                                      className="py-2 px-3 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] text-neutral-750 dark:text-[var(--text-primary)] font-bold rounded-xl text-[10px] cursor-pointer transition-colors text-left"
                                    >
                                      + Pull: "{task.title}" ({task.duration_minutes}m)
                                    </button>
                                  ))}
                                <button
                                  type="button"
                                  onClick={() => handleEveningCheckinSelect("pull_none", null, idx)}
                                  className="py-2 px-3 bg-neutral-105 hover:bg-neutral-200 dark:bg-[var(--bg-card-hover)] text-neutral-555 dark:text-[var(--text-secondary)] font-extrabold rounded-xl text-[10px] cursor-pointer transition-colors text-center"
                                >
                                  No thanks, looks good!
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Decomposition conversational prompt (System 3.6) */}
                      {msg.questionnaire && msg.questionnaire.type === "decomposition" && !msg.questionnaireSubmitted && (
                        <div className="mt-3 bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF] rounded-2xl p-4 shadow-xs space-y-3.5 text-left text-slate-800 dark:text-[var(--text-primary)] w-full min-w-[260px] animate-fade-in font-sans">
                          <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 fill-primary/10 text-primary animate-pulse" />
                            <span>Task Decomposition</span>
                          </div>
                          <p className="text-xs text-neutral-650 dark:text-[var(--text-primary)] font-medium leading-relaxed">
                            <strong>"{msg.questionnaire.taskTitle}"</strong> is large or has high friction. Vague/large tasks are a major source of procrastination. Would you like AI to break it into exactly 3 concrete sub-tasks?
                          </p>
                          <div className="flex gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleDecomposeTaskConfirm(msg.questionnaire.taskId, idx);
                              }}
                              className="flex-1 py-2 bg-primary text-white hover:bg-primary-dark font-bold rounded-xl text-[11px] cursor-pointer transition-all text-center shadow-xs"
                            >
                              ⚡ Decompose with AI
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDecomposeTaskCancel(idx);
                              }}
                              className="flex-1 py-2 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] border border-neutral-250 text-neutral-550 dark:text-[var(--text-secondary)] font-bold rounded-xl text-[11px] cursor-pointer transition-colors text-center"
                            >
                              Keep As Is
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Questionnaire setup wizard card */}
                      {msg.questionnaire && !msg.questionnaireSubmitted && msg.questionnaire.type !== "evening_checkin" && msg.questionnaire.type !== "decomposition" && (
                        <div className="mt-3 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)]/80 rounded-2xl p-4 shadow-xs space-y-3.5 text-left text-slate-800 dark:text-[var(--text-primary)] w-full min-w-[260px] animate-fade-in">
                          <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 fill-primary/10 text-primary" />
                            <span>Plan Setup Wizard</span>
                          </div>
                          <h5 className="text-xs font-extrabold text-neutral-850 dark:text-[var(--text-primary)] leading-tight">
                            {msg.questionnaire.title}
                          </h5>
                          
                          <div className="space-y-3">
                            {msg.questionnaire.questions.map((q: any, qIdx: number) => (
                              <div key={q.id} className="space-y-1">
                                <label className="text-[11px] font-bold text-neutral-550 dark:text-[var(--text-secondary)] block">
                                  {q.label}
                                </label>
                                {q.type === "select" ? (
                                  <select
                                    value={q.value}
                                    onChange={(e) => {
                                      const updated = [...chatHistory];
                                      const msgCopy = { ...updated[idx] };
                                      if (msgCopy.questionnaire) {
                                        const qCopy = { ...msgCopy.questionnaire };
                                        qCopy.questions = qCopy.questions.map((item: any, i: number) =>
                                          i === qIdx ? { ...item, value: e.target.value } : item
                                        );
                                        msgCopy.questionnaire = qCopy;
                                        updated[idx] = msgCopy;
                                        setChatHistory(updated);
                                      }
                                    }}
                                    className="w-full p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] text-neutral-705 focus:outline-none focus:ring-1 focus:ring-primary font-sans cursor-pointer"
                                  >
                                    {q.options?.map((opt: string) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : q.type === "task_list" ? (
                                  <div className="space-y-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl p-2 bg-[var(--bg-page)] ">
                                    {(Array.isArray(q.value) ? q.value : [{ title: "", duration: 30 }]).map((taskItem: any, tIdx: number, arr: any[]) => (
                                      <div key={tIdx} className="flex gap-2 items-center">
                                        <input
                                          type="text"
                                          placeholder="Task / Chapter name"
                                          value={taskItem.title}
                                          onChange={(e) => {
                                            const updated = [...chatHistory];
                                            const msgCopy = { ...updated[idx] };
                                            if (msgCopy.questionnaire) {
                                              const qCopy = { ...msgCopy.questionnaire };
                                              const newList = [...arr];
                                              newList[tIdx] = { ...newList[tIdx], title: e.target.value };
                                              qCopy.questions = qCopy.questions.map((item: any, i: number) =>
                                                i === qIdx ? { ...item, value: newList } : item
                                              );
                                              msgCopy.questionnaire = qCopy;
                                              updated[idx] = msgCopy;
                                              setChatHistory(updated);
                                            }
                                          }}
                                          className="flex-1 p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-lg text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary"
                                        />
                                        <div className="flex items-center gap-1 w-24">
                                          <input
                                            type="number"
                                            value={taskItem.duration}
                                            onChange={(e) => {
                                              const updated = [...chatHistory];
                                              const msgCopy = { ...updated[idx] };
                                              if (msgCopy.questionnaire) {
                                                const qCopy = { ...msgCopy.questionnaire };
                                                const newList = [...arr];
                                                newList[tIdx] = { ...newList[tIdx], duration: parseInt(e.target.value) || 0 };
                                                qCopy.questions = qCopy.questions.map((item: any, i: number) =>
                                                  i === qIdx ? { ...item, value: newList } : item
                                                );
                                                msgCopy.questionnaire = qCopy;
                                                updated[idx] = msgCopy;
                                                setChatHistory(updated);
                                              }
                                            }}
                                            className="w-full p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-lg text-xs bg-white dark:bg-[var(--bg-card)] text-center focus:ring-1 focus:ring-primary"
                                          />
                                          <span className="text-[10px] text-[var(--text-tertiary)] font-bold">m</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...chatHistory];
                                            const msgCopy = { ...updated[idx] };
                                            if (msgCopy.questionnaire) {
                                              const qCopy = { ...msgCopy.questionnaire };
                                              const newList = arr.filter((_, filterIdx) => filterIdx !== tIdx);
                                              qCopy.questions = qCopy.questions.map((item: any, i: number) =>
                                                i === qIdx ? { ...item, value: newList.length > 0 ? newList : [{ title: "", duration: 30 }] } : item
                                              );
                                              msgCopy.questionnaire = qCopy;
                                              updated[idx] = msgCopy;
                                              setChatHistory(updated);
                                            }
                                          }}
                                          className="p-1.5 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...chatHistory];
                                        const msgCopy = { ...updated[idx] };
                                        if (msgCopy.questionnaire) {
                                          const qCopy = { ...msgCopy.questionnaire };
                                          const currentArr = Array.isArray(q.value) ? q.value : [{ title: "", duration: 30 }];
                                          qCopy.questions = qCopy.questions.map((item: any, i: number) =>
                                            i === qIdx ? { ...item, value: [...currentArr, { title: "", duration: 30 }] } : item
                                          );
                                          msgCopy.questionnaire = qCopy;
                                          updated[idx] = msgCopy;
                                          setChatHistory(updated);
                                        }
                                      }}
                                      className="w-full py-1.5 flex items-center justify-center gap-1 text-[11px] font-bold text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Task
                                    </button>
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={q.value}
                                    onChange={(e) => {
                                      const updated = [...chatHistory];
                                      const msgCopy = { ...updated[idx] };
                                      if (msgCopy.questionnaire) {
                                        const qCopy = { ...msgCopy.questionnaire };
                                        qCopy.questions = qCopy.questions.map((item: any, i: number) =>
                                          i === qIdx ? { ...item, value: e.target.value } : item
                                        );
                                        msgCopy.questionnaire = qCopy;
                                        updated[idx] = msgCopy;
                                        setChatHistory(updated);
                                      }
                                    }}
                                    placeholder={q.placeholder}
                                    className="w-full p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] text-neutral-705 focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex gap-2 pt-2.5 border-t border-[var(--border)] dark:border-[var(--border)]">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...chatHistory];
                                updated[idx] = { ...updated[idx], questionnaireSubmitted: true };
                                setChatHistory(updated);
                              }}
                              className="flex-1 py-2 bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] hover:bg-neutral-200 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-bold rounded-xl text-[11px] font-display transition-colors cursor-pointer text-center"
                            >
                              Dismiss
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSubmitQuestionnaire(idx);
                              }}
                              className="flex-1 py-2 bg-primary-gradient hover:opacity-90 text-white font-bold rounded-xl text-[11px] font-display transition-all shadow-sm shadow-primary/20 cursor-pointer text-center"
                            >
                              Generate Plan
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {isProcessingCopilot && (
              <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8] dark:text-white font-bold p-3 bg-[var(--bg-page)] rounded-2xl border border-[var(--border)] dark:border-transparent dark:animate-aurora-shimmer animate-pulse dark:animate-none">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-neutral-650 dark:text-[var(--text-primary)] font-medium transition-all duration-300">
                    {copilotRetryAttempt === 1 ? (
                      <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                        ⚡ AI servers are crowded. Holding your schedule safely...
                      </span>
                    ) : copilotRetryAttempt >= 2 ? (
                      <span className="text-rose-500 font-semibold flex items-center gap-1.5">
                        ⚡ Still retrying. Your data is safe — no changes lost...
                      </span>
                    ) : (
                      copilotLoadingPhase
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopCopilot}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shrink-0"
                >
                  <X className="w-3 h-3" /> Stop
                </button>
              </div>
            )}
          </div>

          {/* Suggestions shortcuts — personalized */}
          {!proposedChanges && !isProcessingCopilot && chatHistory.filter(m => m.sender === "user").length === 0 && (() => {
            const firstName = profileName.split(" ")[0] || "there";
            const todayPending = daySchedule.items
              .filter((i: any) => i.type === "flexible" && i.status !== "done")
              .slice(0, 1);
            const backlogTop = flexibleTasks
              .filter(t => t.status !== "done" && t.scheduled_date === null)
              .slice(0, 1);
            const hour = new Date().getHours();
            const timeGreeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

            const personalized: string[] = [];

            // Thoughtful, context-aware prompt suggestions
            if (hour < 10) {
              personalized.push("Let's set up my schedule for today");
              personalized.push("What is my highest priority task today?");
            } else if (hour >= 21) {
              personalized.push("Summarize my day and help me plan tomorrow");
              personalized.push("Move incomplete tasks to tomorrow");
            } else {
              personalized.push(`I have some free time this ${timeGreeting} — what should I do?`);
              personalized.push("I'm low on energy right now, lighten my load");
            }

            if (todayPending.length > 0) {
              personalized.push(`Move "${todayPending[0].title}" to another day`);
            }

            if (backlogTop.length > 0) {
              personalized.push(`Schedule "${backlogTop[0].title}" for today`);
            } else {
              personalized.push("Show me what is in my backlog");
            }

            personalized.push("Show my streaks and schedule statistics");
            personalized.push("Summarize my day and plan tomorrow");

            return (
              <div className="space-y-1.5 flex-shrink-0">
                <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Try asking:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-none">
                  {personalized.map((sStr) => (
                    <button
                      key={sStr}
                      type="button"
                      onClick={() => setCopilotInput(sStr)}
                      className="text-left py-1.5 px-3 bg-white dark:bg-[var(--bg-card)] hover:bg-primary/5 hover:border-primary/30 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs font-semibold text-[#475569] cursor-pointer transition-all shadow-xs"
                    >
                      {sStr}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Proposed Changes Decisions Card */}
          {proposedChanges && proposedChanges.length > 0 && (
            <div className="p-4 bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF] rounded-xl space-y-3 shadow-xs animate-fade-in text-left flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] font-bold text-[11px] uppercase tracking-wider font-display">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Proposed Changes</span>
              </div>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {proposedChanges.map((change, idx) => (
                  <div key={idx} className="p-2.5 bg-neutral-55 border border-neutral-150 dark:border-[var(--border)] rounded-xl flex items-start gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-light text-primary shrink-0 font-mono inline-block">
                            {change.action}
                          </span>
                          <span className={`text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono inline-block shrink-0 ${ change.confidence === "low" ? "bg-rose-50 text-rose-600 border border-rose-100" : change.confidence === "medium" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100" }`}>
                            {change.confidence || "high"} confidence
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {change.newTime && (
                            <span className="text-[10px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-mono">{change.newTime}</span>
                          )}
                          <button
                            onClick={() => setProposedChanges(prev => prev ? prev.filter((_, i) => i !== idx) : null)}
                            className="p-1 text-[#9999B3] hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Reject this specific change"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[12px] font-medium text-[var(--text-secondary)] dark:text-[var(--text-primary)] leading-relaxed">{change.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input & Mic & Attach Area */}
          <div className="border-t border-[var(--border)] dark:border-[var(--border)] pt-4 space-y-2 flex-shrink-0">
            {copilotImage && (
              <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                {copilotImage.mimeType === "application/pdf" ? (
                  <div className="w-12 h-10 rounded-lg border border-indigo-200 bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 text-[10px] font-black">PDF</span>
                  </div>
                ) : (
                  <img src={copilotImage.previewUrl} alt="Attached" className="w-12 h-10 object-cover rounded-lg border border-white shadow-sm shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-indigo-700 truncate">
                    {copilotImage.mimeType === "application/pdf" ? "PDF ready to send" : "Image ready to send"}
                  </p>
                  <p className="text-[10px] text-indigo-400">AI will extract schedule / workout data</p>
                </div>
                <button onClick={() => setCopilotImage(null)} className="text-indigo-305 hover:text-indigo-600 cursor-pointer shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="relative flex items-center">
              <CopilotTextArea 
                value={copilotInput}
                onSend={(text) => {
                  handleSendCopilotMessage(text);
                }}
                placeholder={
                  proposedChanges
                    ? "Changes ready..."
                    : copilotImage
                      ? "Describe file..."
                      : "Tell AI..."
                }
                disabled={!!proposedChanges}
                isProcessing={isProcessingCopilot}
              />
              
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {!proposedChanges && (
                  <button
                    type="button"
                    onClick={() => copilotImageInputRef.current?.click()}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${ copilotImage ? "bg-indigo-100 text-indigo-600" : "bg-neutral-55 hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[#475569]" }`}
                    title="Attach image or PDF"
                    disabled={isProcessingCopilot}
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                )}

                {speechSupported && !proposedChanges && (
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${ isListening ? "bg-red-500 text-white animate-pulse" : "bg-neutral-55 hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[#475569]" }`}
                    title="Voice dictate"
                    disabled={isProcessingCopilot}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom Actions Area */}
          {proposedChanges && proposedChanges.length > 0 && (
            <div className="flex gap-2.5 flex-shrink-0">
              <button 
                type="button"
                onClick={() => {
                  setProposedChanges(null);
                  setChatHistory(prev => [...prev, { sender: "ai", text: "Got it, let's adjust. What would you like to change?" }]);
                }}
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] hover:bg-neutral-200 dark:bg-[var(--bg-card-hover)] border border-neutral-300 dark:border-[var(--border)] text-[var(--text-primary)] dark:text-[var(--text-primary)] transition-colors cursor-pointer text-center font-display animate-fade-in"
              >
                Revise
              </button>
              <button 
                type="button"
                onClick={handleConfirmAIChanges}
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-primary-gradient hover:opacity-90 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20 text-center font-display animate-fade-in"
              >
                <Check className="w-4 h-4" />
                <span>Confirm</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CopilotPanel.displayName = "CopilotPanel";
