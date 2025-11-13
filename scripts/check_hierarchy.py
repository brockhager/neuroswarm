import requests

# Check for kb page
response = requests.get('https://getblockchain.tech/neuroswarm/wp-json/wp/v2/pages?slug=kb')
if response.status_code == 200:
    pages = response.json()
    if pages:
        kb_page = pages[0]
        print(f'KB page found: {kb_page["title"]["rendered"]} (ID: {kb_page["id"]})')

        # Check children of kb page
        child_response = requests.get(f'https://getblockchain.tech/neuroswarm/wp-json/wp/v2/pages?parent={kb_page["id"]}')
        if child_response.status_code == 200:
            children = child_response.json()
            print(f'Children of KB page: {len(children)}')
            for child in children:
                print(f'  - {child["title"]["rendered"]} (slug: {child["slug"]})')
    else:
        print('No KB page found')
else:
    print(f'Error: {response.status_code}')

# Check if getting-started page has a parent
gs_response = requests.get('https://getblockchain.tech/neuroswarm/wp-json/wp/v2/pages/2111')
if gs_response.status_code == 200:
    gs_page = gs_response.json()
    parent_id = gs_page.get('parent', 0)
    print(f'Getting Started parent ID: {parent_id}')
    if parent_id > 0:
        parent_response = requests.get(f'https://getblockchain.tech/neuroswarm/wp-json/wp/v2/pages/{parent_id}')
        if parent_response.status_code == 200:
            parent = parent_response.json()
            print(f'Parent page: {parent["title"]["rendered"]} (slug: {parent["slug"]})')