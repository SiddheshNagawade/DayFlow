import re

with open("src/App.tsx", "r") as f:
    content = f.read()

def replace_class(match):
    classesStr = match.group(1)
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
            
        if c.startswith('text-neutral-') or c.startswith('text-slate-'):
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

    return 'className="' + ' '.join(new_classes) + '"'

# Process simple className strings
new_content = re.sub(r'className="([^"]+)"', replace_class, content)

with open("src/App.tsx", "w") as f:
    f.write(new_content)
print("Done processing App.tsx")
