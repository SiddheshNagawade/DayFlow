const fs = require('fs');

const appPath = '/Users/siddhesh/Downloads/Apps/My_creations/DayFLow/src/App.tsx';
let appContent = fs.readFileSync(appPath, 'utf8');

// Normalize line endings
appContent = appContent.replace(/\r\n/g, '\n');

const searchStr = `  // System 5: Automatically check and update evaluation history snapshots
  useEffect(() => {
  if (flexibleTasks.length > 0 || taskExecutionLogs.length > 0) {
  checkAndGenerateWeeklySnapshot(flexibleTasks, taskExecutionLogs, selectedDate);
  }
  }, [flexibleTasks, taskExecutionLogs, selectedDate]);`;

const replaceStr = `  // System 5: Automatically check and update evaluation history snapshots
  useEffect(() => {
    if (flexibleTasks.length > 0 || taskExecutionLogs.length > 0) {
      checkAndGenerateWeeklySnapshot(flexibleTasks, taskExecutionLogs);
    }
  }, [flexibleTasks, taskExecutionLogs]);`;

if (appContent.includes(searchStr)) {
  appContent = appContent.replace(searchStr, replaceStr);
  console.log('Successfully updated the useEffect call site in App.tsx!');
} else {
  // Let's search using a regex
  const regex = /\/\/ System 5: Automatically check and update evaluation history snapshots\s*useEffect\(\(\) => \{\s*if \(flexibleTasks\.length > 0 \|\| taskExecutionLogs\.length > 0\) \{\s*checkAndGenerateWeeklySnapshot\(flexibleTasks, taskExecutionLogs, selectedDate\);\s*\}\s*\}, \[flexibleTasks, taskExecutionLogs, selectedDate\]\);/i;
  
  // Let's do a more robust text search
  const idx = appContent.indexOf('checkAndGenerateWeeklySnapshot(flexibleTasks, taskExecutionLogs, selectedDate);');
  if (idx !== -1) {
    const startIdx = appContent.lastIndexOf('useEffect', idx);
    const endIdx = appContent.indexOf(']);', idx) + 3;
    if (startIdx !== -1 && endIdx !== -1) {
      appContent = appContent.substring(0, startIdx) + `useEffect(() => {
    if (flexibleTasks.length > 0 || taskExecutionLogs.length > 0) {
      checkAndGenerateWeeklySnapshot(flexibleTasks, taskExecutionLogs);
    }
  }, [flexibleTasks, taskExecutionLogs]);` + appContent.substring(endIdx);
      console.log('Successfully patched App.tsx by index lookup!');
    } else {
      console.log('Found call site but failed to locate boundaries.');
    }
  } else {
    console.log('Could not find checkAndGenerateWeeklySnapshot in App.tsx');
  }
}

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('Finished App.tsx patch.');
