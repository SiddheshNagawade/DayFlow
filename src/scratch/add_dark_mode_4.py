import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# We'll use regex to find class strings, whether in quotes or backticks.
# Actually, since React uses `className="..."` or `className={`...`}` or `className={'...'}` or ternary `"..." : "..."`,
# we can just find any sequence of characters inside a quotation mark that looks like Tailwind classes.
# To be completely safe and thorough, we will find ANY string literal matching 'bg-white', 'text-neutral-*', etc., 
# and inject the dark class if missing.

def inject_in_string(s):
    # This might match 'text-neutral-900' anywhere in the file.
    # To avoid changing JSON keys or logic strings, we ensure it looks like a class list.
    # But since it's tailwind, it's highly likely safe.
    
    # We will do simple string replaces, checking first to avoid duplicates.
    replacements = [
        ("bg-white", "bg-white dark:bg-zinc-950"),
        ("bg-neutral-50", "bg-neutral-50 dark:bg-zinc-900"),
        ("bg-neutral-100", "bg-neutral-100 dark:bg-zinc-800"),
        ("bg-neutral-200", "bg-neutral-200 dark:bg-zinc-700"),
        
        ("text-slate-900", "text-slate-900 dark:text-zinc-200"),
        ("text-slate-800", "text-slate-800 dark:text-zinc-200"),
        ("text-slate-700", "text-slate-700 dark:text-zinc-300"),
        ("text-slate-600", "text-slate-600 dark:text-zinc-300"),
        ("text-slate-500", "text-slate-500 dark:text-zinc-400"),
        
        ("text-neutral-900", "text-neutral-900 dark:text-zinc-200"),
        ("text-neutral-800", "text-neutral-800 dark:text-zinc-200"),
        ("text-neutral-750", "text-neutral-750 dark:text-zinc-300"),
        ("text-neutral-700", "text-neutral-700 dark:text-zinc-300"),
        ("text-neutral-650", "text-neutral-650 dark:text-zinc-300"),
        ("text-neutral-600", "text-neutral-600 dark:text-zinc-300"),
        ("text-neutral-550", "text-neutral-550 dark:text-zinc-400"),
        ("text-neutral-500", "text-neutral-500 dark:text-zinc-400"),
        ("text-neutral-450", "text-neutral-450 dark:text-zinc-400"),
        
        ("border-neutral-100", "border-neutral-100 dark:border-zinc-800"),
        ("border-neutral-150", "border-neutral-150 dark:border-zinc-800"),
        ("border-neutral-200", "border-neutral-200 dark:border-zinc-800"),
        ("border-neutral-300", "border-neutral-300 dark:border-zinc-700"),
        
        ("border-slate-100", "border-slate-100 dark:border-zinc-800"),
        ("border-slate-200", "border-slate-200 dark:border-zinc-800"),
        
        ("divide-neutral-100", "divide-neutral-100 dark:divide-zinc-800"),
        ("divide-neutral-200", "divide-neutral-200 dark:divide-zinc-800"),
    ]
    
    for old, new in replacements:
        # replace if not already replaced
        if new not in s:
            s = s.replace(old, new)
            
    return s

# A safer way: replace inside anything matching "..." or '...' or `...`
def replacer(match):
    return match.group(1) + inject_in_string(match.group(2)) + match.group(1)

content = re.sub(r'([\'"`])(.*?)\1', replacer, content)

# Remove any accidental duplicates that might have been created (e.g. dark:text-zinc-200 dark:text-zinc-200)
content = re.sub(r'(dark:[a-z-]+-[a-z0-9]+)(\s+\1)+', r'\1', content)

# Specifically for hover states:
content = content.replace("hover:bg-neutral-50", "hover:bg-neutral-50 dark:hover:bg-zinc-800")
content = content.replace("hover:bg-neutral-100", "hover:bg-neutral-100 dark:hover:bg-zinc-700")
content = re.sub(r'(dark:hover:[a-z-]+-[a-z0-9]+)(\s+\1)+', r'\1', content)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Done round 4")
