import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface Props {
  initialUrl: string;
  onFetch: (url: string) => void;
  isLoading: boolean;
}

export const RepositoryInput: React.FC<Props> = ({ initialUrl, onFetch, isLoading }) => {
  const [url, setUrl] = useState(initialUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onFetch(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
        Target Repository
      </label>
      <div className="relative flex items-center">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-md py-2 pl-3 pr-10 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-gray-600"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="absolute right-1.5 p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </button>
      </div>
    </form>
  );
};