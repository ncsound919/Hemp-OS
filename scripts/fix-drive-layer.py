import re

path = 'src/components/DriveKnowledgeLayer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Uncomment commented-out async function declarations followed by live code
# Pattern: "// const funcName = async (...params...) => {"
# The intent is clearly to have these functions active
fixes = [
    (r'// (const handleLogin = async \(\) => \{)', r'\1'),
    (r'// (const handleLogout = async \(\) => \{)', r'\1'),
    (r'// (const handleCreateFolder = async \(e: React\.FormEvent\) => \{)', r'\1'),
    (r'// (const handleUploadFile = async \(e: React\.FormEvent\) => \{)', r'\1'),
    (r'// (const handleSemanticSearch = async \(e: React\.FormEvent\) => \{)', r'\1'),
    # Also uncomment lines inside those functions that were commented out
    (r'// const response = await fetch', r'const response = await fetch'),
    (r'// const data = await response', r'const data = await response'),
]

count = 0
for pattern, replacement in fixes:
    new_content = re.sub(pattern, replacement, content)
    if new_content != content:
        count += 1
    content = new_content

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Fixed {count} patterns in DriveKnowledgeLayer.tsx')
