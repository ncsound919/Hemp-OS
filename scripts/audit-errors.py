import sys, json

data = json.load(sys.stdin)
for f in data:
    errors = [m for m in f['messages'] if m['severity'] == 2]
    if not errors:
        continue
    path = f['filePath'].replace('\\', '/').split('/')
    short = '/'.join(path[-3:])
    print(f'\n=== {short} ===')
    lines = open(f['filePath']).read().splitlines()
    for m in errors:
        code = lines[m['line']-1].strip() if m['line'] <= len(lines) else '???'
        print(f'  L{m["line"]}: [{m["ruleId"]}] {m["message"][:120]}')
        print(f'    → {code}')
