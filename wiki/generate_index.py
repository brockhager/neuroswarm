import os

def generate_index():
    with open('wiki_files_utf8.txt', 'r', encoding='utf-8') as f:
        files = [line.strip() for line in f if line.strip()]

    wiki_root = r'C:\JS\ns\neuroswarm\wiki'
    
    # Organize by directory
    tree = {}
    
    for file_path in files:
        if not file_path.startswith(wiki_root):
            continue
            
        rel_path = file_path[len(wiki_root)+1:]
        parts = rel_path.split(os.sep)
        
        current = tree
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                # It's a file
                if '_files' not in current:
                    current['_files'] = []
                current['_files'].append(part)
            else:
                # It's a directory
                if part not in current:
                    current[part] = {}
                current = current[part]

    # Generate Markdown
    lines = ["# Wiki Index\n", "Complete list of all documentation files.\n"]
    
    def process_node(node, path_prefix="", level=0):
        # Files first
        if '_files' in node:
            for filename in sorted(node['_files']):
                # Skip Index.md itself to avoid recursion confusion, or keep it? Keep it.
                # Skip temporary files
                if filename in ['wiki_files.txt', 'wiki_files_utf8.txt', 'generate_index.py']:
                    continue
                    
                full_rel_path = os.path.join(path_prefix, filename).replace('\\', '/')
                indent = "  " * level
                lines.append(f"{indent}- [{filename}]({full_rel_path})")
        
        # Then directories
        for dirname in sorted(node.keys()):
            if dirname == '_files':
                continue
            
            indent = "  " * level
            lines.append(f"\n{indent}- **{dirname}/**")
            process_node(node[dirname], os.path.join(path_prefix, dirname), level + 1)

    process_node(tree)
    
    with open('Index.md', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

if __name__ == '__main__':
    generate_index()
