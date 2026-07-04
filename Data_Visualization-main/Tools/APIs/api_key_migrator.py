#!/usr/bin/env python3
"""
API Key Migration System

Migrates discovered API keys into the secure vault system.
"""

import os
import json
import datetime
import builtins
from typing import Dict, List, Any, Optional
from simple_vault_manager import SimpleVaultManager
from quick_api_scanner import scan_known_files

class APIKeyMigrator:
    """Handles migration of discovered API keys to the vault."""
    
    def __init__(self):
        self.vault = SimpleVaultManager()
        self.discovered_keys = {}
        
    def load_discovery_results(self, results_file: str = "quick_scan_results.json"):
        """Load discovery results from file."""
        try:
            with open(results_file, 'r') as f:
                self.discovered_keys = json.load(f)
            print(f"Loaded {len(self.discovered_keys)} discovered keys from {results_file}")
        except FileNotFoundError:
            print(f"Discovery results file not found: {results_file}")
            self.discovered_keys = {}
        except Exception as e:
            print(f"Error loading discovery results: {e}")
            self.discovered_keys = {}
    
    def run_discovery(self):
        """Run fresh discovery."""
        print("Running fresh API key discovery...")
        self.discovered_keys = scan_known_files()
        return self.discovered_keys
    
    def map_keys_to_vault_names(self) -> Dict[str, Dict]:
        """Map discovered keys to vault secret names."""
        key_mappings = {}
        
        for key_id, key_info in self.discovered_keys.items():
            key_type = key_info['type']
            
            # Map to vault secret names
            if key_type == 'openai':
                vault_name = 'openai_api_key'
            elif key_type == 'google_places':
                vault_name = 'google_places_api_key'
            elif key_type == 'ollama_api':
                vault_name = 'ollama_api_key'
            elif key_type == 'ssh_public':
                vault_name = 'ssh_public_key'
            else:
                vault_name = f"{key_type}_key"
            
            key_mappings[key_id] = {
                'vault_name': vault_name,
                'type': 'API_KEY',
                'value': key_info['value'],
                'source_file': key_info['file'],
                'confidence': key_info['confidence']
            }
        
        return key_mappings
    
    def prompt_for_migration(self, key_mappings: Dict[str, Dict]) -> List[str]:
        """Prompt user for which keys to migrate."""
        print("\n" + "="*60)
        print("API Key Migration Review")
        print("="*60)
        
        selected_keys = []
        
        for key_id, mapping in key_mappings.items():
            print(f"\nKey ID: {key_id}")
            print(f"  Vault Name: {mapping['vault_name']}")
            print(f"  Type: {mapping['type']}")
            print(f"  Source: {mapping['source_file']}")
            print(f"  Confidence: {mapping['confidence']}")
            print(f"  Value Preview: {mapping['value'][:20]}...")
            
            while True:
                choice = builtins.input(f"Migrate this key? (y/n/skip): ").lower().strip()
                if choice in ['y', 'yes']:
                    selected_keys.append(key_id)
                    break
                elif choice in ['n', 'no', 'skip']:
                    break
                else:
                    print("Please enter 'y', 'n', or 'skip'")
        
        return selected_keys
    
    def migrate_keys(self, selected_key_ids: List[str], key_mappings: Dict[str, Dict]):
        """Migrate selected keys to vault."""
        if not self.vault.has_vault():
            print("\nNo vault found. Initializing new vault...")
            passphrase = builtins.input("Enter new vault passphrase: ")
            self.vault.init_vault(passphrase)
            print("Vault initialized.")
        else:
            print("\nVault exists. Unlocking...")
            passphrase = builtins.input("Enter vault passphrase: ")
            try:
                self.vault.unlock_with_passphrase(passphrase)
                print("Vault unlocked.")
            except Exception as e:
                print(f"Error unlocking vault: {e}")
                return
        
        migrated_count = 0
        
        for key_id in selected_key_ids:
            mapping = key_mappings[key_id]
            
            try:
                # Add to vault
                metadata = {
                    'source_file': mapping['source_file'],
                    'discovery_confidence': mapping['confidence'],
                    'migrated_at': 'auto',
                    'original_key_id': key_id
                }
                
                self.vault.add_secret(
                    name=mapping['vault_name'],
                    secret_type=mapping['type'],
                    value=mapping['value'],
                    rotation_days=60,
                    metadata=metadata
                )
                
                print(f"✅ Migrated: {mapping['vault_name']}")
                migrated_count += 1
                
            except Exception as e:
                print(f"❌ Failed to migrate {mapping['vault_name']}: {e}")
        
        # Commit changes
        if migrated_count > 0:
            self.vault._commit()
            print(f"\nSuccessfully migrated {migrated_count} keys to vault.")
        else:
            print("\nNo keys were migrated.")
    
    def verify_migration(self, key_mappings: Dict[str, Dict]):
        """Verify that keys were migrated correctly."""
        print("\n" + "="*60)
        print("Migration Verification")
        print("="*60)
        
        for key_id, mapping in key_mappings.items():
            vault_name = mapping['vault_name']
            
            try:
                stored_value = self.vault.get_secret_value(vault_name)
                original_value = mapping['value']
                
                if stored_value == original_value:
                    print(f"✅ {vault_name}: Verified")
                else:
                    print(f"❌ {vault_name}: Value mismatch")
                    
            except KeyError:
                print(f"⚠️  {vault_name}: Not found in vault")
            except Exception as e:
                print(f"❌ {vault_name}: Error verifying - {e}")
    
    def generate_migration_report(self, key_mappings: Dict[str, Dict], 
                                 selected_keys: List[str], 
                                 output_file: str = "migration_report.json"):
        """Generate a migration report."""
        report = {
            'migration_timestamp': str(datetime.datetime.now()),
            'total_discovered': len(key_mappings),
            'selected_for_migration': len(selected_keys),
            'key_mappings': key_mappings,
            'selected_key_ids': selected_keys,
            'vault_status': 'initialized' if self.vault.has_vault() else 'not_initialized'
        }
        
        try:
            with open(output_file, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"\nMigration report saved to: {output_file}")
        except Exception as e:
            print(f"Error saving migration report: {e}")

def main():
    """Main migration workflow."""
    import datetime
    
    print("="*60)
    print("API Key Migration System")
    print("="*60)
    
    migrator = APIKeyMigrator()
    
    # Step 1: Load or run discovery
    if os.path.exists("quick_scan_results.json"):
        migrator.load_discovery_results()
    else:
        migrator.run_discovery()
    
    if not migrator.discovered_keys:
        print("No API keys found to migrate.")
        return
    
    # Step 2: Map keys to vault names
    key_mappings = migrator.map_keys_to_vault_names()
    
    # Step 3: Prompt for migration selection
    selected_keys = migrator.prompt_for_migration(key_mappings)
    
    if not selected_keys:
        print("No keys selected for migration.")
        return
    
    # Step 4: Migrate keys
    migrator.migrate_keys(selected_keys, key_mappings)
    
    # Step 5: Verify migration
    migrator.verify_migration(key_mappings)
    
    # Step 6: Generate report
    migrator.generate_migration_report(key_mappings, selected_keys)
    
    print("\n" + "="*60)
    print("Migration Complete!")
    print("="*60)

if __name__ == "__main__":
    main()