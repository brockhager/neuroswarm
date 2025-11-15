#!/usr/bin/env python3
"""
NeuroSwarm WordPress Content Automation Agent

This script automates the publishing of NeuroSwarm documentation and governance
updates to the WordPress site at getblockchain.tech/neuroswarm/ using the REST API.

Features:
- Authenticates with WordPress using Application Passwords
- Creates or updates pages based on slug existence
- Formats content with proper HTML structure
- Uploads images/assets and embeds them in content
- Maintains change logs for transparency
- Never overwrites content without change notes

Usage:
    python wp_publisher.py --username <wp_username> --password <app_password> --content <content_file>

Requirements:
    pip install requests python-dotenv
"""

import os
import sys
import json
import base64
import argparse
import requests
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path

class WordPressPublisher:
    """WordPress REST API Publisher for NeuroSwarm content"""

    def __init__(self, base_url: str, username: str, app_password: str):
        self.base_url = base_url.rstrip('/')
        self.username = username
        self.app_password = app_password
        self.api_base = f"{self.base_url}/wp-json/wp/v2"
        self.session = requests.Session()
        self.session.auth = (username, app_password)
        self.session.headers.update({
            'User-Agent': 'NeuroSwarm Content Publisher/1.0',
            'Content-Type': 'application/json'
        })

    def test_connection(self) -> bool:
        """Test WordPress API connection"""
        try:
            response = self.session.get(f"{self.api_base}/users/me")
            return response.status_code == 200
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False

    def page_exists(self, slug: str) -> Tuple[bool, Optional[int]]:
        """Check if page exists by slug, return (exists, page_id)"""
        try:
            response = self.session.get(f"{self.api_base}/pages", params={'slug': slug})
            if response.status_code == 200:
                pages = response.json()
                if pages:
                    return True, pages[0]['id']
            return False, None
        except Exception as e:
            print(f"Error checking page existence: {e}")
            return False, None

    def upload_media(self, file_path: str, alt_text: str = "") -> Optional[str]:
        """Upload media file and return URL"""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                print(f"Media file not found: {file_path}")
                return None

            # Read file and encode as base64
            with open(file_path, 'rb') as f:
                file_data = f.read()

            # Prepare multipart form data
            files = {
                'file': (file_path.name, file_data, 'image/png')  # Adjust MIME type as needed
            }
            data = {
                'alt_text': alt_text or file_path.stem,
                'caption': f"NeuroSwarm - {file_path.stem}",
                'description': f"Auto-uploaded asset for NeuroSwarm content"
            }

            response = self.session.post(f"{self.api_base}/media", files=files, data=data)

            if response.status_code == 201:
                media_data = response.json()
                print(f"✓ Uploaded media: {media_data['source_url']}")
                return media_data['source_url']
            else:
                print(f"✗ Failed to upload media: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            print(f"Error uploading media: {e}")
            return None

    def create_page(self, title: str, slug: str, content: str, status: str = "publish") -> Tuple[bool, Optional[int]]:
        """Create a new page"""
        try:
            payload = {
                "title": title,
                "slug": slug,
                "content": content,
                "status": status,
                "meta": {
                    "neuroswarm_auto_generated": "true",
                    "last_updated": datetime.now().isoformat()
                }
            }

            response = self.session.post(f"{self.api_base}/pages", json=payload)

            if response.status_code == 201:
                page_data = response.json()
                print(f"✓ Created page: {title} (ID: {page_data['id']})")
                return True, page_data['id']
            else:
                print(f"✗ Failed to create page: {response.status_code} - {response.text}")
                return False, None

        except Exception as e:
            print(f"Error creating page: {e}")
            return False, None

    def update_page(self, page_id: int, title: str, content: str, append_changes: bool = True) -> bool:
        """Update an existing page"""
        try:
            # First get current content to append changes
            current_response = self.session.get(f"{self.api_base}/pages/{page_id}")
            if current_response.status_code != 200:
                print(f"✗ Failed to fetch current page content: {current_response.status_code}")
                return False

            current_page = current_response.json()
            current_content = current_page.get('content', {}).get('rendered', '')

            # Append change note if requested
            if append_changes:
                change_note = f"""
<hr>
<p><em>Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Content synchronized from NeuroSwarm Knowledge Base</em></p>
"""
                content = current_content + change_note + content

            payload = {
                "title": title,
                "content": content,
                "meta": {
                    "neuroswarm_auto_generated": "true",
                    "last_updated": datetime.now().isoformat()
                }
            }

            response = self.session.put(f"{self.api_base}/pages/{page_id}", json=payload)

            if response.status_code == 200:
                print(f"✓ Updated page: {title} (ID: {page_id})")
                return True
            else:
                print(f"✗ Failed to update page: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"Error updating page: {e}")
            return False

    def publish_content(self, content_data: Dict) -> Dict:
        """Main method to publish content to WordPress"""
        title = content_data.get('title', '')
        slug = content_data.get('slug', '')
        content = content_data.get('content', '')
        assets = content_data.get('assets', [])
        status = content_data.get('status', 'publish')

        results = {
            'page_action': None,
            'page_id': None,
            'assets_uploaded': [],
            'success': False,
            'errors': []
        }

        # Upload assets first
        for asset in assets:
            asset_url = self.upload_media(asset['path'], asset.get('alt_text', ''))
            if asset_url:
                # Replace asset references in content
                content = content.replace(asset['placeholder'], asset_url)
                results['assets_uploaded'].append({
                    'original': asset['path'],
                    'url': asset_url
                })
            else:
                results['errors'].append(f"Failed to upload asset: {asset['path']}")

        # Check if page exists
        exists, page_id = self.page_exists(slug)

        if exists and page_id:
            # Update existing page
            success = self.update_page(page_id, title, content)
            results['page_action'] = 'updated'
            results['page_id'] = page_id
            results['success'] = success
        else:
            # Create new page
            success, new_page_id = self.create_page(title, slug, content, status)
            results['page_action'] = 'created'
            results['page_id'] = new_page_id
            results['success'] = success

        return results

def load_content_from_file(file_path: str) -> Dict:
    """Load content data from JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading content file: {e}")
        return {}

def format_markdown_to_html(markdown_content: str) -> str:
    """Convert markdown-style content to HTML (basic implementation)"""
    # This is a basic converter - in production, use a proper markdown library
    html = markdown_content

    # Convert headers
    html = html.replace('## ', '<h2>').replace('\n', '</h2>\n', 1)
    html = html.replace('### ', '<h3>').replace('\n', '</h3>\n', 1)
    html = html.replace('#### ', '<h4>').replace('\n', '</h4>\n', 1)

    # Convert bold
    html = html.replace('**', '<strong>', 1).replace('**', '</strong>', 1)

    # Convert links
    import re
    html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', html)

    # Convert line breaks to paragraphs
    paragraphs = []
    for line in html.split('\n'):
        line = line.strip()
        if line and not line.startswith('<'):
            paragraphs.append(f'<p>{line}</p>')
        elif line:
            paragraphs.append(line)

    return '\n'.join(paragraphs)

def main():
    parser = argparse.ArgumentParser(description='NeuroSwarm WordPress Content Publisher')
    parser.add_argument('--username', required=True, help='WordPress username')
    parser.add_argument('--password', required=True, help='WordPress application password')
    parser.add_argument('--content', required=True, help='Path to content JSON file')
    parser.add_argument('--url', default='https://getblockchain.tech/neuroswarm',
                       help='WordPress site URL')

    args = parser.parse_args()

    # Initialize publisher
    publisher = WordPressPublisher(args.url, args.username, args.password)

    # Test connection
    if not publisher.test_connection():
        print("❌ Failed to connect to WordPress. Check credentials and URL.")
        sys.exit(1)

    print("✅ Connected to WordPress successfully")

    # Load content
    content_data = load_content_from_file(args.content)
    if not content_data:
        print("❌ Failed to load content file")
        sys.exit(1)

    # Convert markdown to HTML if needed
    if 'markdown' in content_data.get('format', '').lower():
        content_data['content'] = format_markdown_to_html(content_data['content'])

    # Publish content
    results = publisher.publish_content(content_data)

    # Output results
    print("\n" + "="*50)
    print("PUBLISHING RESULTS")
    print("="*50)
    print(f"Page Action: {results['page_action']}")
    print(f"Page ID: {results['page_id']}")
    print(f"Success: {results['success']}")
    print(f"Assets Uploaded: {len(results['assets_uploaded'])}")

    if results['assets_uploaded']:
        print("\nAssets:")
        for asset in results['assets_uploaded']:
            print(f"  ✓ {asset['original']} -> {asset['url']}")

    if results['errors']:
        print("\nErrors:")
        for error in results['errors']:
            print(f"  ✗ {error}")

    # Save results to log file
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'content_title': content_data.get('title', ''),
        'content_slug': content_data.get('slug', ''),
        'results': results
    }

    log_file = os.environ.get('WP_PUBLISH_LOG_PATH', os.path.join('..', 'governance', 'logs', 'wp_publish_log.jsonl'))
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(json.dumps(log_entry) + '\n')

    print(f"\n📝 Results logged to {log_file}")

    if results['success']:
        print("🎉 Content published successfully!")
        sys.exit(0)
    else:
        print("❌ Content publishing failed!")
        sys.exit(1)

if __name__ == '__main__':
    main()