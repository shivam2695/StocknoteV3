import React from 'react';
import { CheckCircle, Clock, XCircle, Eye, Activity } from 'lucide-react';

export type FocusStockTag = 'worked' | 'missed' | 'failed' | 'watch' | 'monitor';

interface FocusStockTagsProps {
  selectedTag?: FocusStockTag;
  onTagChange: (tag: FocusStockTag) => void;
  disabled?: boolean;
  displayMode?: 'select' | 'display';
}

export default function FocusStockTags({ 
  selectedTag, 
  onTagChange, 
  disabled = false,
  displayMode = 'select'
}: FocusStockTagsProps) {
  const tags = [
    {
      id: 'monitor' as FocusStockTag,
      label: 'Monitor',
      icon: Activity,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      selectedColor: 'bg-purple-500 text-white border-purple-500'
    },
    {
      id: 'watch' as FocusStockTag,
      label: 'Setup Waiting',
      icon: Eye,
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      selectedColor: 'bg-amber-500 text-white border-amber-500'
    },
    {
      id: 'worked' as FocusStockTag,
      label: 'Entered',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800 border-green-200',
      selectedColor: 'bg-green-500 text-white border-green-500'
    },
    {
      id: 'failed' as FocusStockTag,
      label: 'Failed',
      icon: XCircle,
      color: 'bg-red-100 text-red-800 border-red-200',
      selectedColor: 'bg-red-500 text-white border-red-500'
    },
    {
      id: 'missed' as FocusStockTag,
      label: 'Missed Entry',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      selectedColor: 'bg-yellow-500 text-white border-yellow-500'
    }
  ];

  // Display mode - show only the selected tag
  if (displayMode === 'display') {
    if (!selectedTag) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          No tag
        </span>
      );
    }

    const tag = tags.find(t => t.id === selectedTag);
    if (!tag) return null;

    const Icon = tag.icon;
    
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${tag.color}`}>
        <Icon className="w-3 h-3" />
        <span>{tag.label}</span>
      </span>
    );
  }

  // Select mode - show pill buttons for selection
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const Icon = tag.icon;
        const isSelected = selectedTag === tag.id;
        
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onTagChange(tag.id)}
            disabled={disabled}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              isSelected ? tag.selectedColor : tag.color
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
          >
            <Icon className="w-3 h-3" />
            <span>{tag.label}</span>
          </button>
        );
      })}
      
      {selectedTag && (
        <button
          type="button"
          onClick={() => onTagChange('' as FocusStockTag)}
          disabled={disabled}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}