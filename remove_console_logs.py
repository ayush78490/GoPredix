#!/usr/bin/env python3
"""
Remove console.log statements from TypeScript/JavaScript files.
Preserves console.error for production debugging.
"""

import re
import os
import sys
from pathlib import Path

def remove_console_logs(file_path):
    """Remove console.log statements while preserving code structure."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern to match console.log statements
    # Handles single-line and multi-line console.log calls
    patterns = [
        # Single line console.log
        r'^\s*console\.log\([^)]*\);?\s*$',
        # Multi-line console.log (simple objects)
        r'^\s*console\.log\(\{[^}]*\}\);?\s*$',
    ]
    
    lines = content.split('\n')
    new_lines = []
    skip_until_close = False
    brace_count = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if this line starts a console.log
        if re.search(r'console\.log\(', line) and not re.search(r'console\.error', line):
            # Count opening and closing parens/braces
            open_count = line.count('(') + line.count('{')
            close_count = line.count(')') + line.count('}')
            
            # If balanced on same line, skip just this line
            if open_count == close_count:
                i += 1
                continue
            
            # Otherwise, skip until we find the closing
            brace_count = open_count - close_count
            i += 1
            while i < len(lines) and brace_count > 0:
                line = lines[i]
                brace_count += line.count('(') + line.count('{')
                brace_count -= line.count(')') + line.count('}')
                i += 1
            continue
        
        # Keep console.warn lines
        if 'console.warn' in line:
            i += 1
            continue
            
        new_lines.append(line)
        i += 1
    
    new_content = '\n'.join(new_lines)
    
    # Only write if content changed
    if new_content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    frontend_dir = Path('/home/ayu/Documents/Predection-Market/Frontend')
    
    # Directories to process
    dirs_to_process = ['app', 'components', 'hooks', 'lib']
    
    # File extensions to process
    extensions = {'.ts', '.tsx', '.js', '.jsx'}
    
    files_modified = 0
    files_scanned = 0
    
    for dir_name in dirs_to_process:
        dir_path = frontend_dir / dir_name
        if not dir_path.exists():
            continue
            
        for file_path in dir_path.rglob('*'):
            if file_path.suffix in extensions and file_path.is_file():
                # Skip node_modules and .next
                if 'node_modules' in str(file_path) or '.next' in str(file_path):
                    continue
                    
                files_scanned += 1
                if remove_console_logs(file_path):
                    files_modified += 1
                    print(f"✓ {file_path.relative_to(frontend_dir)}")
    
    print(f"\n✅ Done!")
    print(f"   Files scanned: {files_scanned}")
    print(f"   Files modified: {files_modified}")

if __name__ == '__main__':
    main()
