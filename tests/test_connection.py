#!/usr/bin/env python3
"""
WordPress Connection Test Script

Tests the connection to WordPress and validates API access
without publishing any content.

Usage:
    python test_connection.py --username <user> --password <pass>
"""

import os
import sys
import argparse
import requests
from typing import Dict
from wp_publisher import WordPressPublisher

def test_basic_connection(publisher: WordPressPublisher) -> bool:
    """Test basic API connectivity"""
    print("🔗 Testing basic connection...")
    try:
        response = publisher.session.get(f"{publisher.api_base}/")
        if response.status_code == 200:
            print("✅ Basic API connection successful")
            return True
        else:
            print(f"❌ Basic API connection failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def test_authentication(publisher: WordPressPublisher) -> bool:
    """Test authentication with user credentials"""
    print("🔐 Testing authentication...")
    try:
        response = publisher.session.get(f"{publisher.api_base}/users/me")
        if response.status_code == 200:
            user_data = response.json()
            print(f"✅ Authentication successful for user: {user_data.get('name', 'Unknown')}")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return False

def test_permissions(publisher: WordPressPublisher) -> Dict[str, bool]:
    """Test various API permissions"""
    print("🔑 Testing permissions...")

    permissions = {
        'read_pages': False,
        'create_pages': False,
        'upload_media': False
    }

    # Test reading pages
    try:
        response = publisher.session.get(f"{publisher.api_base}/pages", params={'per_page': 1})
        permissions['read_pages'] = response.status_code == 200
        print(f"   Read pages: {'✅' if permissions['read_pages'] else '❌'}")
    except:
        print("   Read pages: ❌")

    # Test creating pages (we'll use a test slug and delete it)
    try:
        test_payload = {
            "title": "Connection Test Page",
            "slug": "neuroswarm-connection-test-temp",
            "content": "<p>This is a temporary test page.</p>",
            "status": "draft"
        }
        response = publisher.session.post(f"{publisher.api_base}/pages", json=test_payload)
        if response.status_code == 201:
            permissions['create_pages'] = True
            page_data = response.json()
            page_id = page_data['id']
            # Clean up test page
            publisher.session.delete(f"{publisher.api_base}/pages/{page_id}")
            print("   Create pages: ✅")
        else:
            print(f"   Create pages: ❌ ({response.status_code})")
    except Exception as e:
        print(f"   Create pages: ❌ ({str(e)})")

    # Test media upload (we'll try with a small test image)
    try:
        # Create a minimal test image (1x1 pixel PNG)
        test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01]\xdbF\x1a\x00\x00\x00\x00IEND\xaeB`\x82'
        files = {'file': ('test.png', test_image_data, 'image/png')}
        response = publisher.session.post(f"{publisher.api_base}/media", files=files)
        if response.status_code == 201:
            permissions['upload_media'] = True
            media_data = response.json()
            media_id = media_data['id']
            # Clean up test media
            publisher.session.delete(f"{publisher.api_base}/media/{media_id}")
            print("   Upload media: ✅")
        else:
            print(f"   Upload media: ❌ ({response.status_code})")
    except Exception as e:
        print(f"   Upload media: ❌ ({str(e)})")

    return permissions

def test_wordpress_info(publisher: WordPressPublisher) -> None:
    """Get basic WordPress site information"""
    print("ℹ️  Gathering WordPress site information...")
    try:
        # Get site info
        response = publisher.session.get(f"{publisher.base_url}/wp-json/")
        if response.status_code == 200:
            site_data = response.json()
            print(f"   Site Name: {site_data.get('name', 'Unknown')}")
            print(f"   Site Description: {site_data.get('description', 'Unknown')}")
            print(f"   WordPress Version: {site_data.get('version', 'Unknown')}")

        # Get page count
        response = publisher.session.get(f"{publisher.api_base}/pages", params={'per_page': 1})
        if response.status_code == 200:
            total_pages = response.headers.get('X-WP-Total', 'Unknown')
            print(f"   Total Pages: {total_pages}")

    except Exception as e:
        print(f"❌ Error gathering site info: {e}")

def generate_report(connection_ok: bool, auth_ok: bool, permissions: Dict[str, bool]) -> str:
    """Generate a test report"""
    report = []
    report.append("=" * 50)
    report.append("WORDPRESS CONNECTION TEST REPORT")
    report.append("=" * 50)

    report.append(f"Connection: {'✅ PASS' if connection_ok else '❌ FAIL'}")
    report.append(f"Authentication: {'✅ PASS' if auth_ok else '❌ FAIL'}")

    report.append("\nPermissions:")
    for perm, status in permissions.items():
        report.append(f"  {perm.replace('_', ' ').title()}: {'✅' if status else '❌'}")

    # Overall assessment
    all_perms_ok = all(permissions.values())
    overall_status = "✅ READY" if (connection_ok and auth_ok and all_perms_ok) else "❌ ISSUES FOUND"

    report.append(f"\nOverall Status: {overall_status}")

    if not all_perms_ok:
        report.append("\n⚠️  Some permissions are missing. Check WordPress user role and capabilities.")

    return "\n".join(report)

def main():
    parser = argparse.ArgumentParser(description='WordPress Connection Test')
    parser.add_argument('--username', required=True, help='WordPress username')
    parser.add_argument('--password', required=True, help='WordPress application password')
    parser.add_argument('--url', default='https://getblockchain.tech/neuroswarm',
                       help='WordPress site URL')

    args = parser.parse_args()

    print("🧪 Starting WordPress connection test...\n")

    # Initialize publisher
    publisher = WordPressPublisher(args.url, args.username, args.password)

    # Run tests
    connection_ok = test_basic_connection(publisher)
    print()

    auth_ok = False
    permissions = {}

    if connection_ok:
        auth_ok = test_authentication(publisher)
        print()

        if auth_ok:
            permissions = test_permissions(publisher)
            print()

        test_wordpress_info(publisher)
        print()

    # Generate report
    report = generate_report(connection_ok, auth_ok, permissions)
    print(report)

    # Exit with appropriate code
    if connection_ok and auth_ok and all(permissions.values()):
        print("\n🎉 All tests passed! Ready to publish content.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the issues above.")
        sys.exit(1)

if __name__ == '__main__':
    main()