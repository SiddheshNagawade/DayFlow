import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Update CopilotTextArea
old_textarea = 'className="w-full pl-3 pr-14 py-2.5 border border-neutral-200 dark:border-[var(--color-bg-dark-hover)] rounded-2xl text-xs bg-white focus:bg-white dark:bg-[var(--color-bg-dark-surface)] focus:ring-1 focus:ring-primary focus:outline-none resize-none font-sans font-medium"'
new_textarea = 'className="w-full pl-4 pr-14 py-3 text-xs focus:outline-none resize-none font-sans font-medium bg-white border border-neutral-200 dark:gemini-input-capsule dark:text-[var(--color-text-dark-primary)]"'
content = content.replace(old_textarea, new_textarea)

# 2. Update chat bubbles
old_chat = 'className={`p-3.5 text-xs leading-relaxed ${ isAI ? "bg-[#F6F5FF] border border-[#E0D9FF] text-[#1F2937] rounded-xl font-medium shadow-none text-left" : "bg-primary text-white rounded-xl font-semibold shadow-[0_2px_4px_rgba(79,70,229,0.2)] text-left" }`}'
new_chat = 'className={`text-xs leading-relaxed ${ isAI ? "p-3.5 bg-[#F6F5FF] border border-[#E0D9FF] text-[#1F2937] rounded-xl font-medium shadow-none text-left dark:msg-model dark:border-transparent" : "p-3.5 bg-primary text-white rounded-xl font-semibold shadow-[0_2px_4px_rgba(79,70,229,0.2)] text-left dark:msg-user dark:shadow-none" }`}'
content = content.replace(old_chat, new_chat)

# 3. Update processing shimmer
old_shimmer = 'className="flex items-center justify-between gap-2 text-xs text-[#94A3B8] font-bold p-3 bg-neutral-50 dark:bg-[var(--color-bg-dark-hover)] rounded-2xl border border-neutral-100 dark:border-[var(--color-bg-dark-hover)] animate-pulse"'
new_shimmer = 'className="flex items-center justify-between gap-2 text-xs text-[#94A3B8] dark:text-white font-bold p-3 bg-neutral-50 rounded-2xl border border-neutral-100 dark:border-transparent dark:animate-aurora-shimmer animate-pulse dark:animate-none"'
content = content.replace(old_shimmer, new_shimmer)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Applied Gemini utilities")
