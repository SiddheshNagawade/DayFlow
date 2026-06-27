import re

with open("src/App.tsx", "r") as f:
    content = f.read()

def replace_bg_white_opacity(match):
    full_str = match.group(0)
    opacity = match.group(1)
    
    # Check if there's already a dark:bg- in the string
    # We will just replace bg-white/XX with bg-white/XX dark:bg-zinc-950/XX
    # But wait, it might be safer to just use a simple string replace
    return full_str # not used

# Simple replacement for specific opacities
opacities = ["95", "90", "80", "50", "45", "40", "30", "20", "10", "5"]
for op in opacities:
    old = f"bg-white/{op}"
    new = f"bg-white/{op} dark:bg-zinc-950/{op}"
    # Replace only if not already followed by dark:bg-zinc-950
    # A bit tricky, let's just do a blanket replace and then fix duplicates
    content = content.replace(old, new)
    
# Fix duplicates
content = content.replace("dark:bg-zinc-950/95 dark:bg-zinc-950/95", "dark:bg-zinc-950/95")
content = content.replace("dark:bg-zinc-950/90 dark:bg-zinc-950/90", "dark:bg-zinc-950/90")
# ... we can do this with regex:
content = re.sub(r'(dark:bg-zinc-950/\d+)(\s+\1)+', r'\1', content)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Done round 3")
