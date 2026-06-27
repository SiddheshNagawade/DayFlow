import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Remove backdrop-blur
content = re.sub(r'\bbackdrop-blur-[a-z0-9-]+\b', '', content)
content = re.sub(r'\bbg-white/\d+\b', 'bg-white', content)
content = re.sub(r'\bdark:bg-zinc-\d+/\d+\b', '', content)
content = re.sub(r'\bdark:bg-\[\#[0-9a-fA-F]+\]/\d+\b', '', content)

# 2. Replace zinc backgrounds with the new surface tokens
content = content.replace('dark:bg-zinc-950', 'dark:bg-[var(--color-bg-dark-surface)]')
content = content.replace('dark:bg-zinc-900', 'dark:bg-[var(--color-bg-dark-hover)]')
content = content.replace('dark:bg-zinc-800', 'dark:bg-[var(--color-bg-dark-hover)]')
content = content.replace('dark:bg-zinc-700', 'dark:bg-[var(--color-bg-dark-hover)]')

# 3. Replace zinc text with new text tokens
content = content.replace('dark:text-zinc-100', 'dark:text-[var(--color-text-dark-primary)]')
content = content.replace('dark:text-zinc-200', 'dark:text-[var(--color-text-dark-primary)]')
content = content.replace('dark:text-zinc-300', 'dark:text-[var(--color-text-dark-primary)]')
content = content.replace('dark:text-zinc-400', 'dark:text-[var(--color-text-dark-muted)]')

# 4. Replace zinc borders with transparent or surface borders (since Gemini is flat)
content = content.replace('dark:border-zinc-800', 'dark:border-[var(--color-bg-dark-hover)]')
content = content.replace('dark:border-zinc-700', 'dark:border-[var(--color-bg-dark-hover)]')
content = content.replace('border-white/40', 'border-transparent')
content = content.replace('border-white/20', 'border-transparent')

# Clean up multiple spaces
content = re.sub(r' {2,}', ' ', content)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Applied Gemini flat theme")
