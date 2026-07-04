import json
with open('scripts/eslint-remaining.json', encoding='utf-8') as f:
    data = json.load(f)
errs = 0
for file in data:
    for m in file['messages']:
        if m['severity'] == 2:
            errs += 1
            path = '/'.join(file['filePath'].replace('\\', '/').split('/')[-3:])
            print(f'  {path}:{m["line"]}  {m["ruleId"]}  {m["message"][:100]}')
print(f'\nTotal errors remaining: {errs}')
