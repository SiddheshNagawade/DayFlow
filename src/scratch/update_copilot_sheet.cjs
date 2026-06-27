const fs = require('fs');

const appPath = '/Users/siddhesh/Downloads/Apps/My_creations/DayFLow/src/App.tsx';
let appContent = fs.readFileSync(appPath, 'utf8');
appContent = appContent.replace(/\r\n/g, '\n');

// 1. Remove state: const [todaySubTab, setTodaySubTab] = useState<"timeline" | "copilot">("timeline");
const subTabDeclStr = 'const [todaySubTab, setTodaySubTab] = useState<"timeline" | "copilot">("timeline");';
if (appContent.includes(subTabDeclStr)) {
  appContent = appContent.replace(subTabDeclStr, '');
  console.log('Removed todaySubTab state declaration.');
}

// 2. Simplify setActiveBottomSheet to not set todaySubTab
const activeSheetSearchStr = `  const setActiveBottomSheet = (sheet: "fixed" | "flexible" | "emergency" | "assistant" | "profile" | "eodreview" | "goal" | null) => {
  setRawActiveBottomSheet(sheet);
  if (sheet === "assistant" && activeTab === "today") {
  setTodaySubTab("copilot");
  }
  };`;

const activeSheetReplaceStr = `  const setActiveBottomSheet = (sheet: "fixed" | "flexible" | "emergency" | "assistant" | "profile" | "eodreview" | "goal" | null) => {
    setRawActiveBottomSheet(sheet);
  };`;

if (appContent.includes(activeSheetSearchStr)) {
  appContent = appContent.replace(activeSheetSearchStr, activeSheetReplaceStr);
  console.log('Simplified setActiveBottomSheet.');
}

// 3. Remove inline Copilot block in Today page
const inlineCopilotSearchStr = `  {/* Column 2: Day Coach Chat (only on mobile when tab active; desktop uses slide-over) */}
  <div className={\`\${todaySubTab === "copilot" ? "flex" : "hidden"} md:hidden flex-col w-full bg-white dark:bg-[var(--bg-card)] h-full overflow-hidden p-4 text-left\`}>
  {renderCopilotContent(true)}
  </div>`;

if (appContent.includes(inlineCopilotSearchStr)) {
  appContent = appContent.replace(inlineCopilotSearchStr, '');
  console.log('Removed inline copilot block from Today page.');
}

// 4. Find Sheet 3 (AI Copilot) container and update it
const sheet3Regex = /<div\s+className=\{\`fixed z-\[100\] bg-white dark:bg-\[var\(--bg-card\)\] transition-all duration-300 ease-in-out flex flex-col overflow-hidden[\s\S]*?\{renderCopilotContent\(false\)\}\s*<\/div>\s*<\/div>/i;

const sheet3Replacement = `<div 
    className={\`fixed z-[100] bg-white dark:bg-[var(--bg-card)] transition-all duration-300 ease-in-out flex flex-col overflow-hidden top-0 bottom-0 left-0 right-0 w-full h-full p-4 md:p-6 \${
      activeBottomSheet === "assistant" 
        ? "translate-y-0 opacity-100 pointer-events-auto md:translate-x-0" 
        : "translate-y-full opacity-0 pointer-events-none invisible md:translate-x-full"
    } \${
      isCopilotFullScreen 
        ? "md:max-w-3xl md:left-auto md:right-0 md:top-0 md:bottom-0 md:h-screen md:rounded-l-3xl md:rounded-r-none md:border md:border-neutral-200 md:dark:border-[var(--border)]/80 md:shadow-2xl" 
        : "md:left-auto md:right-0 md:top-0 md:bottom-0 md:h-screen md:w-[380px] md:max-w-md md:rounded-l-3xl md:rounded-r-none md:border md:border-neutral-200 md:dark:border-[var(--border)]/80 md:shadow-2xl"
    }\`}
  >
    {!isCopilotFullScreen && (
      <div className="hidden md:flex justify-center pb-3">
        <span className="w-10 h-1 bg-neutral-200 dark:bg-[var(--bg-card-hover)] rounded-full" />
      </div>
    )}
    <div className="flex-1 overflow-y-auto">
      {renderCopilotContent(false)}
    </div>
  </div>`;

if (sheet3Regex.test(appContent)) {
  appContent = appContent.replace(sheet3Regex, sheet3Replacement);
  console.log('Successfully updated Sheet 3 AI Copilot container styles.');
} else {
  console.log('Failed to find Sheet 3 AI Copilot container.');
}

// 5. Update renderCopilotContent header: Insert back button
const copilotHeaderSearchStr = `  {/* Header */}
  <div className="flex items-center justify-between mb-4 gap-2 border-b border-[var(--border-strong)] dark:border-[var(--border)]/40 pb-3 flex-shrink-0">
  <h3 className="font-display font-semibold text-sm md:text-base text-[#0F172A] flex items-center gap-1.5 shrink-0">
  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary fill-primary/10 shrink-0" />
  <span>Day Coach</span>`;

const copilotHeaderReplaceStr = `  {/* Header */}
  <div className="flex items-center justify-between mb-4 gap-2 border-b border-[var(--border-strong)] dark:border-[var(--border)]/40 pb-3 flex-shrink-0">
  <h3 className="font-display font-semibold text-sm md:text-base text-[#0F172A] flex items-center gap-1.5 shrink-0">
  {!isInline && (
    <button
      type="button"
      onClick={() => {
        setActiveBottomSheet(null);
        setCopilotInput("");
        setProposedChanges(null);
        setChatHistory([]);
      }}
      className="p-1.5 hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-800 rounded-lg text-neutral-555 dark:text-[var(--text-primary)] cursor-pointer mr-1 active:scale-95 transition-all"
      title="Go Back"
    >
      <ChevronLeft className="w-5 h-5 stroke-[2.5px]" />
    </button>
  )}
  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary fill-primary/10 shrink-0" />
  <span>Day Coach</span>`;

if (appContent.includes(copilotHeaderSearchStr)) {
  appContent = appContent.replace(copilotHeaderSearchStr, copilotHeaderReplaceStr);
  console.log('Successfully added back button to Copilot header.');
} else {
  console.log('Failed to find Copilot header sparkles text.');
}

// 6. Remove X button from renderCopilotContent:
const exitButtonIndex = appContent.indexOf('{/* Exit/Close Chat button */}');
if (exitButtonIndex !== -1) {
  const closingIndex = appContent.indexOf(')}', exitButtonIndex);
  if (closingIndex !== -1) {
    appContent = appContent.substring(0, exitButtonIndex) + appContent.substring(closingIndex + 2);
    console.log('Successfully removed close button from Copilot header.');
  } else {
    console.log('Found Exit/Close Chat button comment but failed to find closing bracket.');
  }
} else {
  console.log('Failed to find Exit/Close Chat button comment.');
}

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('Finished updating App.tsx.');
