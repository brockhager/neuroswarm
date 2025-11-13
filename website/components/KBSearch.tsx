'use client';

import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { searchIndex } from '@/lib/search-index';
import { trackSearch } from './Analytics';

const fuse = new Fuse(searchIndex, {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'content', weight: 0.3 },
    { name: 'category', weight: 0.2 },
    { name: 'description', weight: 0.1 }
  ],
  threshold: 0.3,
  includeScore: true,
  includeMatches: true
});

interface SearchResult {
  item: typeof searchIndex[0];
  score?: number;
  matches?: any[];
}

export default function KBSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const searchResults = fuse.search(query).slice(0, 6) as SearchResult[];

    // Track search if we have results
    if (searchResults.length > 0) {
      trackSearch(query, searchResults.length);
    }

    return searchResults;
  }, [query]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(e.target.value.length > 0);
  };

  const clearSearch = () => {
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder="Search the knowledge base..."
          className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <Link
              key={result.item.id}
              href={result.item.slug}
              onClick={() => setIsOpen(false)}
              className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {result.item.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {result.item.description}
                  </p>
                  <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                    {result.item.category}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-center">
            No results found for "{query}"
          </p>
        </div>
      )}
    </div>
  );
}