const fs = require('fs');

const file = '/Users/siddhesh/Downloads/Apps/My_creations/DayFLow/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Simplest regex replacements for full words, ignoring duplicates by checking if "dark:" is nearby.
content = content.replace(/\\bbg-white\\b/g, 'bg-white dark:bg-[#2A2B36]');
// Clean up any double replacements just in case
content = content.replace(/dark:bg-\\[#2A2B36\\] dark:bg-\\[#2A2B36\\]/g, 'dark:bg-[#2A2B36]');

content = content.replace(/\\bbg-neutral-50\\b/g, 'bg-neutral-50 dark:bg-[#1E2028]');
content = content.replace(/dark:bg-\\[#1E2028\\] dark:bg-\\[#1E2028\\]/g, 'dark:bg-[#1E2028]');

content = content.replace(/\\btext-slate-800\\b/g, 'text-slate-800 dark:text-[#F3F4F6]');
content = content.replace(/dark:text-\\[#F3F4F6\\] dark:text-\\[#F3F4F6\\]/g, 'dark:text-[#F3F4F6]');

content = content.replace(/\\btext-slate-900\\b/g, 'text-slate-900 dark:text-white');
content = content.replace(/dark:text-white dark:text-white/g, 'dark:text-white');

content = content.replace(/\\btext-neutral-800\\b/g, 'text-neutral-800 dark:text-[#F3F4F6]');

content = content.replace(/\\bborder-neutral-200\\b/g, 'border-neutral-200 dark:border-[#3E404D]');
content = content.replace(/dark:border-\\[#3E404D\\] dark:border-\\[#3E404D\\]/g, 'dark:border-[#3E404D]');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully injected dark mode tailwind variants into App.tsx');
