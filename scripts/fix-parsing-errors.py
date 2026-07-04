import re

files_fixes = {
    'src/components/PolicyAutonomy.tsx': [
        (r'// (const runOptimization = async \(\) => \{)', r'\1'),
    ],
    'src/components/ScientificSuperSystems.tsx': [
        (r'// (const \w+ = async \([\w:, ]*\) => \{)', r'\1'),
    ],
    'src/components/StrainBreedLab.tsx': [
        # Fix line with missing semicolon — likely an object literal issue
        (r'(\{ subject: .+ \},)\s*$', r'\1'),
    ],
}

for path, fix_list in files_fixes.items():
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    count = 0
    for pattern, replacement in fix_list:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            count += 1
        content = new_content
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'{path}: {count} fixes applied')
