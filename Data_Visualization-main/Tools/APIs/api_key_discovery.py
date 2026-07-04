#!/usr/bin/env python3
"""
API Key Discovery System

Scans text files and PDFs in the repository to extract API keys and credentials
for migration into the secure vault system.
"""

import os
import re
import json
import base64
import hashlib
import datetime
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
import logging

# Try to import PyPDF2, make it optional for environments without it
try:
    from PyPDF2 import PdfReader
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class APIKeyDiscovery:
    """Discovers API keys and credentials from various file formats."""
    
    def __init__(self, repo_path: str = None):
        self.repo_path = repo_path or os.getcwd()
        self.discovered_keys = {}
        self.patterns = self._load_api_key_patterns()
        
    def _load_api_key_patterns(self) -> Dict[str, List[str]]:
        """Load regex patterns for common API key formats."""
        return {
            'openai': [
                r'sk-[A-Za-z0-9]{48}',
                r'sk-proj-[A-Za-z0-9\-_]{48,}'
            ],
            'google_places': [
                r'AIza[A-Za-z0-9\-_]{35}'
            ],
            'google_api': [
                r'AIza[A-Za-z0-9\-_]{39}'
            ],
            'ollama': [
                r'[a-f0-9]{32}\.[A-Za-z0-9]{20,}'
            ],
            'ssh_public_key': [
                r'ssh-(rsa|ed25519|ecdsa) [A-Za-z0-9+/]+[=]{0,3}'
            ],
            'aws_access_key': [
                r'AKIA[0-9A-Z]{16}'
            ],
            'aws_secret': [
                r'[0-9a-zA-Z/+=]{40}'
            ],
            'generic_api_key': [
                r'[Aa][Pp][Ii][_\-]?[Kk][Ee][Yy][\s=:]+["\']?([A-Za-z0-9\-_]{16,})["\']?',
                r'[Ss][Ee][Cc][Rr][Ee][Tt][\s=:]+["\']?([A-Za-z0-9\-_]{16,})["\']?'
            ]
        }
    
    def scan_text_file(self, file_path: str) -> Dict[str, Any]:
        """Scan a text file for API keys."""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                return self._extract_keys_from_content(content, file_path)
        except Exception as e:
            logger.error(f"Error scanning {file_path}: {e}")
            return {}
    
    def scan_pdf_file(self, file_path: str) -> Dict[str, Any]:
        """Scan a PDF file for API keys."""
        if not PYPDF2_AVAILABLE:
            logger.warning(f"PyPDF2 not available - skipping PDF: {file_path}")
            return {}
            
        try:
            with open(file_path, 'rb') as f:
                reader = PdfReader(f)
                content = ""
                for page in reader.pages:
                    try:
                        content += page.extract_text() + "\n"
                    except Exception as e:
                        logger.warning(f"Could not extract text from page in {file_path}: {e}")
                        continue
                
                return self._extract_keys_from_content(content, file_path)
        except Exception as e:
            logger.error(f"Error scanning PDF {file_path}: {e}")
            return {}
    
    def _extract_keys_from_content(self, content: str, file_path: str) -> Dict[str, Any]:
        """Extract API keys from content using regex patterns."""
        found_keys = {}
        
        for key_type, patterns in self.patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, content, re.MULTILINE | re.IGNORECASE)
                
                for match in matches:
                    key_value = match.group(1) if match.lastindex else match.group(0)
                    
                    # Skip obvious false positives
                    if self._is_false_positive(key_value, content):
                        continue
                    
                    key_id = hashlib.md5(key_value.encode()).hexdigest()[:12]
                    
                    found_keys[key_id] = {
                        'type': key_type,
                        'value': key_value,
                        'file_path': file_path,
                        'line_context': self._get_line_context(content, match.start()),
                        'confidence': self._calculate_confidence(key_type, key_value, match.group()),
                        'discovered_at': f"{os.path.basename(file_path)}:{self._get_line_number(content, match.start())}"
                    }
        
        return found_keys
    
    def _is_false_positive(self, key_value: str, content: str) -> bool:
        """Check if the found key is likely a false positive."""
        false_positives = [
            'AIzaSyDku0wIa5eAajUs91mVqrgJfu-S5Z8MDzk',  # Example key
            'your_api_key_here',
            'api_key_example',
            'test_api_key',
            'demo_key'
        ]
        
        return key_value in false_positives or len(key_value) < 16
    
    def _calculate_confidence(self, key_type: str, key_value: str, full_match: str) -> float:
        """Calculate confidence score for discovered key."""
        base_confidence = {
            'openai': 0.95,
            'google_places': 0.90,
            'google_api': 0.85,
            'ollama': 0.85,
            'aws_access_key': 0.90,
            'ssh_public_key': 0.95,
            'generic_api_key': 0.40
        }
        
        confidence = base_confidence.get(key_type, 0.50)
        
        # Adjust based on key characteristics
        if len(key_value) > 30:
            confidence += 0.10
        if any(char in key_value for char in ['_', '-', '=']):
            confidence += 0.05
        if re.search(r'[A-Za-z]', key_value) and re.search(r'[0-9]', key_value):
            confidence += 0.10
        
        return min(confidence, 1.0)
    
    def _get_line_context(self, content: str, pos: int) -> str:
        """Get surrounding context for the match."""
        lines = content[:pos].split('\n')
        if lines:
            current_line = len(lines) - 1
            start = max(0, current_line - 1)
            end = min(len(content.split('\n')), current_line + 2)
            return '\n'.join(content.split('\n')[start:end])
        return ""
    
    def _get_line_number(self, content: str, pos: int) -> int:
        """Get line number for the position."""
        return content[:pos].count('\n') + 1
    
    def discover_repository(self) -> Dict[str, Any]:
        """Scan the entire repository for API keys."""
        logger.info(f"Starting API key discovery in: {self.repo_path}")
        
        results = {
            'scanned_files': 0,
            'found_keys': {},
            'file_types': {}
        }
        
        # File types to scan
        text_extensions = {'.txt', '.py', '.js', '.json', '.yaml', '.yml', '.env', '.md', '.log', '.config', '.conf'}
        pdf_extensions = {'.pdf'}
        
        for root, dirs, files in os.walk(self.repo_path):
            # Skip hidden directories and common exclusion patterns
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '__pycache__', '.git']]
            
            for file in files:
                file_path = os.path.join(root, file)
                file_ext = Path(file).suffix.lower()
                
                try:
                    if file_ext in text_extensions:
                        results['scanned_files'] += 1
                        results['file_types'][file_ext] = results['file_types'].get(file_ext, 0) + 1
                        
                        found = self.scan_text_file(file_path)
                        if found:
                            results['found_keys'].update(found)
                    
                    elif file_ext in pdf_extensions:
                        # Only scan PDFs that seem relevant
                        if any(keyword in file.lower() for keyword in ['api', 'key', 'credential', 'secret']):
                            results['scanned_files'] += 1
                            results['file_types'][file_ext] = results['file_types'].get(file_ext, 0) + 1
                            
                            found = self.scan_pdf_file(file_path)
                            if found:
                                results['found_keys'].update(found)
                
                except Exception as e:
                    logger.error(f"Error processing {file_path}: {e}")
                    continue
        
        logger.info(f"Discovery complete. Scanned {results['scanned_files']} files, found {len(results['found_keys'])} potential API keys.")
        return results
    
    def group_keys_by_type(self, discovered_keys: Dict[str, Any]) -> Dict[str, List[Dict]]:
        """Group discovered keys by type for easier review."""
        grouped = {}
        
        for key_id, key_info in discovered_keys.items():
            key_type = key_info['type']
            if key_type not in grouped:
                grouped[key_type] = []
            grouped[key_type].append({**key_info, 'id': key_id})
        
        return grouped
    
    def export_discovery_report(self, results: Dict[str, Any], output_file: str = "discovery_report.json"):
        """Export discovery results to a JSON report."""
        report = {
            'scan_timestamp': str(datetime.datetime.now()),
            'scan_location': self.repo_path,
            'summary': {
                'files_scanned': results['scanned_files'],
                'keys_found': len(results['found_keys']),
                'file_types': results['file_types']
            },
            'discovered_keys': results['found_keys'],
            'grouped_keys': self.group_keys_by_type(results['found_keys'])
        }
        
        try:
            with open(output_file, 'w') as f:
                json.dump(report, f, indent=2)
            logger.info(f"Discovery report exported to: {output_file}")
        except Exception as e:
            logger.error(f"Error exporting report: {e}")

def main():
    """Run API key discovery."""
    import datetime
    
    print("="*60)
    print("API Key Discovery System")
    print("="*60)
    
    discovery = APIKeyDiscovery()
    results = discovery.discover_repository()
    
    if results['found_keys']:
        print(f"\nDiscovery Summary:")
        print(f"   Files scanned: {results['scanned_files']}")
        print(f"   Potential API keys found: {len(results['found_keys'])}")
        
        # Group by type
        grouped = discovery.group_keys_by_type(results['found_keys'])
        print(f"\nKeys by type:")
        for key_type, keys in grouped.items():
            print(f"   {key_type}: {len(keys)}")
        
        # Show high-confidence keys
        high_confidence = {k: v for k, v in results['found_keys'].items() if v['confidence'] > 0.8}
        if high_confidence:
            print(f"\nHigh-confidence keys ({len(high_confidence)}):")
            for key_id, key_info in high_confidence.items():
                print(f"   {key_info['type']} - {key_info['discovered_at']}")
        
        # Export report
        discovery.export_discovery_report(results)
        print(f"\nDetailed report saved to: discovery_report.json")
        
    else:
        print("\nNo API keys found in the repository.")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    main()