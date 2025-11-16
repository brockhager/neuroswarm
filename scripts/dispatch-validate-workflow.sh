#!/usr/bin/env bash
workflowFile=${1:-validate-packaging-and-wiki.yml}
ref=${2:-}
if ! command -v gh >/dev/null 2>&1; then echo 'Error: gh CLI not found'; exit 1; fi
echo "Dispatching workflow $workflowFile"
if [ -n "$ref" ]; then
	gh workflow run "$workflowFile" --ref "$ref"
else
	gh workflow run "$workflowFile"
fi
echo "Dispatched; check Actions -> Validate Packaging & Wiki Sync"
