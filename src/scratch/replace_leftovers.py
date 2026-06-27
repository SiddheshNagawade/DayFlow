file_path = "/Users/siddhesh/Downloads/Apps/My_creations/DayFLow/src/App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Verify matching indices
print(f"Line 10416 (index 10415): {repr(lines[10415])}")
print(f"Line 10425 (index 10424): {repr(lines[10424])}")

if 'actionType: "tomorrow"' in lines[10415] and ')}' in lines[10424]:
    # Replace lines 10416 to 10425 (inclusive)
    # python slice lines[10415:10425] contains indices 10415 to 10424
    lines[10415:10425] = ["                              )}\n"]
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("SUCCESS: Index-based replacement completed successfully!")
else:
    print("ERROR: Safety checks failed, verify line indices!")
