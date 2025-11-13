#!/usr/bin/env python3
"""
NeuroSwarm Content Sync Agent

Automatically synchronizes documentation and governance updates
from the NeuroSwarm knowledge base to WordPress.

This script monitors for changes in documentation files and
publishes updates to the WordPress site.

Usage:
    python content_sync.py --watch
"""

import os
import sys
import time
import json
import argparse
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set
from wp_publisher import WordPressPublisher

class ContentSyncAgent:
    """Synchronizes NeuroSwarm content to WordPress"""

    def __init__(self, wp_publisher: WordPressPublisher, content_dirs: List[str]):
        self.publisher = wp_publisher
        self.content_dirs = [Path(d) for d in content_dirs]
        self.checksum_file = Path('.content_checksums.json')
        self.checksums = self.load_checksums()
        self.synced_files: Set[str] = set()

    def load_checksums(self) -> Dict[str, str]:
        """Load previously calculated checksums"""
        if self.checksum_file.exists():
            try:
                with open(self.checksum_file, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {}

    def save_checksums(self):
        """Save current checksums"""
        with open(self.checksum_file, 'w') as f:
            json.dump(self.checksums, f, indent=2)

    def calculate_checksum(self, file_path: Path) -> str:
        """Calculate MD5 checksum of file"""
        hash_md5 = hashlib.md5()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    def find_content_files(self) -> List[Path]:
        """Find all JSON content files in monitored directories"""
        content_files = []
        for content_dir in self.content_dirs:
            if content_dir.exists():
                content_files.extend(content_dir.glob('**/*.json'))
        return content_files

    def has_file_changed(self, file_path: Path) -> bool:
        """Check if file has changed since last sync"""
        file_key = str(file_path)
        current_checksum = self.calculate_checksum(file_path)

        if file_key not in self.checksums:
            return True

        return self.checksums[file_key] != current_checksum

    def load_content_data(self, file_path: Path) -> Dict:
        """Load and validate content data"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Validate required fields
            required = ['title', 'slug', 'content']
            for field in required:
                if field not in data:
                    print(f"⚠️  Missing required field '{field}' in {file_path}")
                    return None

            return data
        except Exception as e:
            print(f"❌ Error loading {file_path}: {e}")
            return None

    def sync_file(self, file_path: Path) -> bool:
        """Sync a single content file to WordPress"""
        print(f"📄 Syncing: {file_path.name}")

        # Load content
        content_data = self.load_content_data(file_path)
        if not content_data:
            return False

        # Publish content
        try:
            result = self.publisher.publish_content(content_data)

            if result['success']:
                # Update checksum
                file_key = str(file_path)
                self.checksums[file_key] = self.calculate_checksum(file_path)
                self.synced_files.add(file_key)

                print(f"✅ Synced: {content_data['title']} ({result['page_action']})")
                return True
            else:
                print(f"❌ Failed to sync: {content_data['title']}")
                if result['errors']:
                    for error in result['errors']:
                        print(f"   Error: {error}")
                return False

        except Exception as e:
            print(f"❌ Sync error for {file_path}: {e}")
            return False

    def sync_all(self) -> Dict[str, int]:
        """Sync all changed content files"""
        print("🔄 Starting content synchronization...")

        content_files = self.find_content_files()
        if not content_files:
            print("⚠️  No content files found")
            return {'total': 0, 'synced': 0, 'skipped': 0, 'failed': 0}

        stats = {'total': len(content_files), 'synced': 0, 'skipped': 0, 'failed': 0}

        for file_path in content_files:
            if self.has_file_changed(file_path):
                if self.sync_file(file_path):
                    stats['synced'] += 1
                else:
                    stats['failed'] += 1
            else:
                stats['skipped'] += 1
                print(f"⏭️  Unchanged: {file_path.name}")

        # Save updated checksums
        self.save_checksums()

        return stats

    def watch_mode(self, interval: int = 300):
        """Watch for changes and sync automatically"""
        print(f"👀 Entering watch mode (checking every {interval} seconds)")
        print("Press Ctrl+C to stop")

        try:
            while True:
                stats = self.sync_all()

                if stats['synced'] > 0:
                    print(f"📊 Synced {stats['synced']} files this cycle")
                else:
                    print("📊 No changes detected")

                print(f"⏰ Next check in {interval} seconds...")
                time.sleep(interval)

        except KeyboardInterrupt:
            print("\n👋 Watch mode stopped")
            self.save_checksums()

def main():
    parser = argparse.ArgumentParser(description='NeuroSwarm Content Sync Agent')
    parser.add_argument('--username', required=True, help='WordPress username')
    parser.add_argument('--password', required=True, help='WordPress application password')
    parser.add_argument('--url', default='https://getblockchain.tech/neuroswarm',
                       help='WordPress site URL')
    parser.add_argument('--content-dirs', nargs='+',
                       default=['./docs', './content', './knowledge-base'],
                       help='Directories to monitor for content files')
    parser.add_argument('--watch', action='store_true',
                       help='Watch for changes and sync automatically')
    parser.add_argument('--interval', type=int, default=300,
                       help='Watch mode check interval (seconds)')

    args = parser.parse_args()

    # Initialize publisher
    publisher = WordPressPublisher(args.url, args.username, args.password)

    # Test connection
    if not publisher.test_connection():
        print("❌ Failed to connect to WordPress. Check credentials and URL.")
        sys.exit(1)

    print("✅ Connected to WordPress successfully")

    # Initialize sync agent
    sync_agent = ContentSyncAgent(publisher, args.content_dirs)

    if args.watch:
        # Watch mode
        sync_agent.watch_mode(args.interval)
    else:
        # One-time sync
        stats = sync_agent.sync_all()

        print("\n" + "="*50)
        print("SYNC SUMMARY")
        print("="*50)
        print(f"Total files: {stats['total']}")
        print(f"Synced: {stats['synced']}")
        print(f"Skipped: {stats['skipped']}")
        print(f"Failed: {stats['failed']}")

        if stats['failed'] > 0:
            print("❌ Some files failed to sync")
            sys.exit(1)
        else:
            print("✅ Sync completed successfully")

if __name__ == '__main__':
    main()