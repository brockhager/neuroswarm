#!/usr/bin/env python3
"""
Batch Content Publisher for NeuroSwarm

Processes multiple content files and publishes them to WordPress.
Handles dependencies, error recovery, and progress tracking.

Usage:
    python batch_publish.py --directory ./content --pattern "*.json"
"""

import os
import sys
import json
import argparse
import time
from pathlib import Path
from typing import List, Dict
from wp_publisher import WordPressPublisher

class BatchPublisher:
    """Batch content publishing with progress tracking and error recovery"""

    def __init__(self, wp_publisher: WordPressPublisher):
        self.publisher = wp_publisher
        self.results = []
        self.stats = {
            'total': 0,
            'successful': 0,
            'failed': 0,
            'skipped': 0
        }

    def load_content_files(self, directory: str, pattern: str = "*.json") -> List[Path]:
        """Find all content files matching pattern"""
        content_dir = Path(directory)
        if not content_dir.exists():
            print(f"❌ Content directory not found: {directory}")
            return []

        return list(content_dir.glob(pattern))

    def validate_content_file(self, file_path: Path) -> bool:
        """Validate content file structure"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            required_fields = ['title', 'slug', 'content']
            for field in required_fields:
                if field not in data:
                    print(f"❌ Missing required field '{field}' in {file_path}")
                    return False

            return True
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in {file_path}: {e}")
            return False
        except Exception as e:
            print(f"❌ Error reading {file_path}: {e}")
            return False

    def publish_batch(self, content_files: List[Path], delay: float = 1.0) -> Dict:
        """Publish multiple content files with progress tracking"""
        total_files = len(content_files)
        print(f"🚀 Starting batch publish of {total_files} files")

        for i, file_path in enumerate(content_files, 1):
            print(f"\n📄 [{i}/{total_files}] Processing: {file_path.name}")

            # Validate file
            if not self.validate_content_file(file_path):
                self.stats['skipped'] += 1
                self.results.append({
                    'file': str(file_path),
                    'status': 'skipped',
                    'reason': 'validation_failed'
                })
                continue

            # Load content
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content_data = json.load(f)
            except Exception as e:
                print(f"❌ Failed to load {file_path}: {e}")
                self.stats['failed'] += 1
                self.results.append({
                    'file': str(file_path),
                    'status': 'failed',
                    'reason': 'load_error',
                    'error': str(e)
                })
                continue

            # Publish content
            try:
                result = self.publisher.publish_content(content_data)

                if result['success']:
                    self.stats['successful'] += 1
                    status = 'success'
                else:
                    self.stats['failed'] += 1
                    status = 'failed'

                self.results.append({
                    'file': str(file_path),
                    'status': status,
                    'page_action': result['page_action'],
                    'page_id': result['page_id'],
                    'assets_uploaded': len(result['assets_uploaded']),
                    'errors': result['errors']
                })

            except Exception as e:
                print(f"❌ Publishing failed for {file_path}: {e}")
                self.stats['failed'] += 1
                self.results.append({
                    'file': str(file_path),
                    'status': 'failed',
                    'reason': 'publish_error',
                    'error': str(e)
                })

            # Rate limiting delay
            if delay > 0 and i < total_files:
                time.sleep(delay)

        return {
            'stats': self.stats,
            'results': self.results
        }

    def generate_report(self) -> str:
        """Generate a summary report of the batch operation"""
        report = []
        report.append("=" * 60)
        report.append("NEUROSWARM BATCH PUBLISHING REPORT")
        report.append("=" * 60)
        report.append(f"Total Files: {self.stats['total']}")
        report.append(f"Successful: {self.stats['successful']}")
        report.append(f"Failed: {self.stats['failed']}")
        report.append(f"Skipped: {self.stats['skipped']}")
        report.append("")

        if self.results:
            report.append("DETAILED RESULTS:")
            report.append("-" * 40)

            for result in self.results:
                status_icon = {
                    'success': '✅',
                    'failed': '❌',
                    'skipped': '⏭️'
                }.get(result['status'], '❓')

                report.append(f"{status_icon} {Path(result['file']).name}")
                report.append(f"   Status: {result['status']}")

                if result.get('page_action'):
                    report.append(f"   Action: {result['page_action']}")
                if result.get('page_id'):
                    report.append(f"   Page ID: {result['page_id']}")
                if result.get('assets_uploaded', 0) > 0:
                    report.append(f"   Assets: {result['assets_uploaded']}")

                if result.get('errors'):
                    report.append(f"   Errors: {', '.join(result['errors'])}")
                if result.get('reason'):
                    report.append(f"   Reason: {result['reason']}")

                report.append("")

        return "\n".join(report)

def main():
    parser = argparse.ArgumentParser(description='Batch Content Publisher for NeuroSwarm')
    parser.add_argument('--username', required=True, help='WordPress username')
    parser.add_argument('--password', required=True, help='WordPress application password')
    parser.add_argument('--directory', default='./content', help='Content directory')
    parser.add_argument('--pattern', default='*.json', help='File pattern to match')
    parser.add_argument('--url', default='https://getblockchain.tech/neuroswarm',
                       help='WordPress site URL')
    parser.add_argument('--delay', type=float, default=1.0,
                       help='Delay between publishes (seconds)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Validate files without publishing')

    args = parser.parse_args()

    # Initialize publisher
    publisher = WordPressPublisher(args.url, args.username, args.password)

    # Test connection (unless dry run)
    if not args.dry_run:
        if not publisher.test_connection():
            print("❌ Failed to connect to WordPress. Check credentials and URL.")
            sys.exit(1)
        print("✅ Connected to WordPress successfully")

    # Initialize batch publisher
    batch_publisher = BatchPublisher(publisher)

    # Find content files
    content_files = batch_publisher.load_content_files(args.directory, args.pattern)
    if not content_files:
        print(f"❌ No content files found in {args.directory} matching {args.pattern}")
        sys.exit(1)

    batch_publisher.stats['total'] = len(content_files)

    if args.dry_run:
        print(f"🔍 Dry run: Found {len(content_files)} files to validate")
        for file_path in content_files:
            valid = batch_publisher.validate_content_file(file_path)
            status = "✅ Valid" if valid else "❌ Invalid"
            print(f"   {status}: {file_path.name}")
        sys.exit(0)

    # Publish batch
    results = batch_publisher.publish_batch(content_files, args.delay)

    # Generate and display report
    report = batch_publisher.generate_report()
    print("\n" + report)

    # Save detailed results
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    report_file = f"batch_publish_report_{timestamp}.json"

    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n📊 Detailed results saved to {report_file}")

    # Exit with appropriate code
    if results['stats']['failed'] > 0:
        print("⚠️  Some files failed to publish. Check the report for details.")
        sys.exit(1)
    else:
        print("🎉 All files published successfully!")
        sys.exit(0)

if __name__ == '__main__':
    main()