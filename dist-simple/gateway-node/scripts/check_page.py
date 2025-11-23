import requests

# Check if kb/getting-started page exists
response = requests.get('https://getblockchain.tech/neuroswarm/wp-json/wp/v2/pages?slug=kb/getting-started')
if response.status_code == 200:
    pages = response.json()
    if pages:
        print(f'Found existing page: {pages[0]["title"]["rendered"]} (ID: {pages[0]["id"]})')
        print(f'URL: https://getblockchain.tech/neuroswarm/kb/getting-started/')
    else:
        print('No page found with slug kb/getting-started')
else:
    print(f'Error checking pages: {response.status_code}')