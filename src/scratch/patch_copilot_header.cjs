const fs = require('fs');

const appPath = '/Users/siddhesh/Downloads/Apps/My_creations/DayFLow/src/App.tsx';
let appContent = fs.readFileSync(appPath, 'utf8');

// Normalize line endings
appContent = appContent.replace(/\r\n/g, '\n');

// Find renderCopilotContent declaration
const headerIndex = appContent.indexOf('const renderCopilotContent = (isInline: boolean) => {');
if (headerIndex !== -1) {
  // Let's find the first occurrence of Sparkles inside renderCopilotContent
  const sparklesIndex = appContent.indexOf('<Sparkles ', headerIndex);
  if (sparklesIndex !== -1) {
    // Let's find the opening h3 of the title before it
    const h3Index = appContent.lastIndexOf('<h3 ', sparklesIndex);
    if (h3Index !== -1) {
      // Find the end of the h3 opening tag (the > character)
      const h3CloseTagIndex = appContent.indexOf('>', h3Index);
      if (h3CloseTagIndex !== -1) {
        // We want to insert the back button right after the h3 opening tag!
        const backBtnStr = `\n  {!isInline && (
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
  )}`;
        appContent = appContent.substring(0, h3CloseTagIndex + 1) + backBtnStr + appContent.substring(h3CloseTagIndex + 1);
        console.log('Successfully inserted ChevronLeft back button after h3 opening tag!');
      } else {
        console.log('Failed to find end of h3 opening tag.');
      }
    } else {
      console.log('Failed to find opening h3 before Sparkles.');
    }
  } else {
    console.log('Failed to find Sparkles inside renderCopilotContent.');
  }
} else {
  console.log('Failed to find renderCopilotContent.');
}

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('Finished patch.');
