import re

with open("src/App.tsx", "r") as f:
    content = f.read()

def inject_dark_classes(classesStr):
    classes = classesStr.split()
    new_classes = []
    
    has_dark_bg = any(c.startswith('dark:bg-') for c in classes)
    has_dark_text = any(c.startswith('dark:text-') for c in classes)
    has_dark_border = any(c.startswith('dark:border-') for c in classes)
    
    for c in classes:
        new_classes.append(c)
        if c == 'bg-white' and not has_dark_bg:
            new_classes.append('dark:bg-zinc-950')
            has_dark_bg = True
        elif c == 'bg-neutral-50' and not has_dark_bg:
            new_classes.append('dark:bg-zinc-900')
            has_dark_bg = True
        elif c == 'bg-neutral-100' and not has_dark_bg:
            new_classes.append('dark:bg-zinc-800')
            has_dark_bg = True
        elif c == 'bg-neutral-200' and not has_dark_bg:
            new_classes.append('dark:bg-zinc-700')
            has_dark_bg = True
        elif c == 'bg-slate-50' and not has_dark_bg:
            new_classes.append('dark:bg-zinc-900')
            has_dark_bg = True
            
        if c.startswith('text-neutral-') or c.startswith('text-slate-') or c.startswith('text-slate-'):
            if not has_dark_text:
                if c.endswith('900') or c.endswith('800') or c.endswith('950') or c.endswith('850'):
                    new_classes.append('dark:text-zinc-200')
                    has_dark_text = True
                elif c.endswith('700') or c.endswith('600') or c.endswith('750'):
                    new_classes.append('dark:text-zinc-300')
                    has_dark_text = True
                elif c.endswith('500') or c.endswith('550'):
                    new_classes.append('dark:text-zinc-400')
                    has_dark_text = True
                    
        if c.startswith('border-neutral-') or c.startswith('border-slate-'):
            if not has_dark_border:
                if c.endswith('100') or c.endswith('200') or c.endswith('150'):
                    new_classes.append('dark:border-zinc-800')
                    has_dark_border = True
                elif c.endswith('300'):
                    new_classes.append('dark:border-zinc-700')
                    has_dark_border = True

    return ' '.join(new_classes)

def replace_backticks(match):
    return 'className={`' + inject_dark_classes(match.group(1)) + '`}'

def replace_single_quotes(match):
    return "className='" + inject_dark_classes(match.group(1)) + "'"

def replace_ternary(match):
    # This might be tricky, we just look for 'bg-white' in the whole file and replace if missing dark variant?
    # Better to just use a regex for string literals inside JSX
    return match.group(0)

new_content = re.sub(r'className=\{`([^`]+)`\}', replace_backticks, content)
new_content = re.sub(r"className='([^']+)'", replace_single_quotes, new_content)

# We can also find literal strings inside { ... ? "..." : "..." }
def replace_literal_strings(match):
    quote = match.group(1)
    inner = match.group(2)
    return quote + inject_dark_classes(inner) + quote

# Matches "..." or '...' but avoiding matching the className="..." itself if possible.
# A simpler approach is to search for 'bg-white' and if it doesn't have 'dark:bg-zinc-950' nearby, inject it.
# Let's just do a simple string replace for remaining bg-white inside ternaries
new_content = new_content.replace('"bg-white"', '"bg-white dark:bg-zinc-950"')
new_content = new_content.replace("'bg-white'", "'bg-white dark:bg-zinc-950'")
new_content = new_content.replace(' bg-white ', ' bg-white dark:bg-zinc-950 ')
new_content = new_content.replace('"bg-neutral-50"', '"bg-neutral-50 dark:bg-zinc-900"')
new_content = new_content.replace("'bg-neutral-50'", "'bg-neutral-50 dark:bg-zinc-900'")
new_content = new_content.replace(' bg-neutral-50 ', ' bg-neutral-50 dark:bg-zinc-900 ')

with open("src/App.tsx", "w") as f:
    f.write(new_content)
print("Done processing App.tsx round 2")
