#!/usr/bin/env python3
"""
Vault Seed Script

Populates the local encrypted vault with your existing API keys.
Run this once to bootstrap the vault with all keys for your MCPs.
"""

import os
import json
import builtins
from vault_manager import VaultManager

def main():
    print("Digital Lab Vault Seeder")
    print("=========================")
    print()
    vault = VaultManager()

    if not vault.has_vault():
        passphrase = builtins.input("Enter new vault passphrase: ")
        vault.init_vault(passphrase)
        print("\nVault initialized.")
    else:
        passphrase = builtins.input("Enter vault passphrase: ")
        vault.unlock_with_passphrase(passphrase)

    secrets_to_seed = {
        "pathosphere_api_key": {"type": "API_KEY", "rotation_days": 60},
        "genmutant_api_key": {"type": "API_KEY", "rotation_days": 60},
        "biosim_api_key": {"type": "API_KEY", "rotation_days": 60},
        "opencrispr_api_key": {"type": "API_KEY", "rotation_days": 60},
        "monai_api_key": {"type": "API_KEY", "rotation_days": 60},
        "notebook_api_key": {"type": "API_KEY", "rotation_days": 60},
        "bioware_api_key": {"type": "API_KEY", "rotation_days": 60},
        "qlcce_api_key": {"type": "API_KEY", "rotation_days": 60},
    }

    for name, config in secrets_to_seed.items():
        value = builtins.input(f"Enter value for {name}: ")
        if not value:
            continue
        metadata = {"owner": "user", "scope": name}
        vault.add_secret(name, config["type"], value, config["rotation_days"], metadata)
        print(f"Added secret '{name}'")

    vault._commit()
    print(f"\nVault seeded with {len(secrets_to_seed)} secrets.")

if __name__ == "__main__":
    main()