#!/usr/bin/env python3
"""
This script has moved to admin-node/scripts/wp_publisher.py

We relocated the WordPress automation tooling under `neuroswarm/admin-node/scripts/`
so admin-specific Python tooling is grouped with admin responsibilities. The
new path keeps the `ns-node` execution paths free of Python dependencies.

If you intended to run the publisher, use:

  python3 admin-node/scripts/wp_publisher.py --username <user> --password <app-password> --content <file.json>

Or use the convenience wrapper:

  ./admin-node/scripts/wp_publisher.py --username ...

Note: on Windows, use python or py launcher instead of python3 as appropriate.
"""

import sys
print('This script was moved to admin-node/scripts/wp_publisher.py — please update your workflow or use that path.')
sys.exit(2)