import { useState, useRef, useEffect } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { useRouter, type Route } from '@/lib/router';
import { invidious } from '@/lib/invidious';

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { route, navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (route.name === 'search') setQuery(route.query);
  }, [route]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const sugs = await invidious.getSearchSuggestions(query);
        setSuggestions(sugs);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const doSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setShowSuggestions(false);
    setActiveIndex(-1);
    navigate({ name: 'search', query: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        doSearch(suggestions[activeIndex]);
      } else {
        doSearch(query);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  return (
    <header className="sticky top-0 z-50 h-14 flex items-center gap-2 px-4 bg-neutral-900 border-b border-neutral-800">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-full hover:bg-neutral-800 text-neutral-300"
        aria-label="Menu"
      >
        <Menu size={22} />
      </button>

      <div
        ref={searchRef}
        className="flex-1 max-w-2xl mx-auto relative"
      >
        <div className="flex">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); setActiveIndex(-1); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search"
            className="flex-1 bg-neutral-800 text-neutral-100 px-4 py-2 rounded-l-full border border-neutral-700 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => doSearch(query)}
            className="px-5 py-2 bg-neutral-800 border border-l-0 border-neutral-700 rounded-r-full hover:bg-neutral-700 text-neutral-300"
            aria-label="Search"
          >
            <Search size={20} />
          </button>
          {query && (
            <button
              onClick={() => { setQuery(''); setSuggestions([]); }}
              className="ml-1 p-2 rounded-full hover:bg-neutral-800 text-neutral-400"
              aria-label="Clear"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden z-50">
            {suggestions.map((sug, i) => (
              <button
                key={sug}
                onClick={() => doSearch(sug)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-700 ${i === activeIndex ? 'bg-neutral-700' : ''}`}
              >
                <Search size={16} className="text-neutral-500" />
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

export function navItem(icon: React.ReactNode, label: string, route: Route, navigate: (r: Route) => void, active: boolean) {
  return (
    <button
      key={label}
      onClick={() => navigate(route)}
      className={`w-full flex items-center gap-6 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-300 hover:bg-neutral-800'}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
