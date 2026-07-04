#!/usr/bin/env python3
"""
Quick API Key Scanner

Focused scanner for known API key files in repository.
"""

import os
import re
import json
import hashlib
from typing import Dict, List, Any

def scan_known_files():
    """Scan known API key files."""
    results = {}
    
    # Known API key files
    known_files = [
        "C:\\Users\\tap45\\Desktop\\Overlay Labs\\api keys.txt"
    ]
    
    # API key patterns
    patterns = {
        'openai': r'sk-[A-Za-z0-9\-_]{20,}',
        'google_places': r'AIza[A-Za-z0-9\-_]{35}',
        'ollama_api': r'[a-f0-9]{32}\.[A-Za-z0-9]{20,}',
        'ssh_public': r'ssh-(ed25519|rsa) [A-Za-z0-9+/]+[=]{0,3}'
    }
    
    for file_path in known_files:
        if os.path.exists(file_path):
            print(f"Scanning: {os.path.basename(file_path)}")
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                for key_type, pattern in patterns.items():
                    matches = re.findall(pattern, content)
                    if matches:
                        for match in matches:
                            key_id = hashlib.md5(match.encode()).hexdigest()[:8]
                            results[key_id] = {
                                'type': key_type,
                                'value': match,
                                'file': os.path.basename(file_path),
                                'confidence': 'high'
                            }
                            
            except Exception as e:
                print(f"Error scanning {file_path}: {e}")
    
    return results

def main():
    print("Quick API Key Scanner")
    print("=" * 40)
    
    results = scan_known_files()
    
    if results:
        print(f"\nFound {len(results)} API keys:")
        for key_id, info in results.items():
            print(f"  {info['type']}: {info['value'][:20]}...")
            print(f"    File: {info['file']}")
        
        # Save results
        with open('quick_scan_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to: quick_scan_results.json")
    else:
        print("No API keys found.")

if __name__ == "__main__":
    main()