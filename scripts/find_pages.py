import requests

response = requests.get('https://getblockchain.tech/neuroswarm/wp-json/wp/v2/pages?per_page=50')
if response.status_code == 200:
    pages = response.json()
    getting_started_pages = [p for p in pages if 'getting' in p['title']['rendered'].lower() or 'getting' in p['slug']]
    if getting_started_pages:
        for page in getting_started_pages:
            print(f'Found: {page["title"]["rendered"]} - Slug: {page["slug"]} - ID: {page["id"]}')
    else:
        print('No getting started pages found')
        print(f'Total pages: {len(pages)}')
else:
    print(f'Error: {response.status_code}')