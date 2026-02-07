import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      {/* Thumbnail skeleton */}
      <div className="w-full h-48 bg-gray-200 relative">
        <div className="absolute top-3 right-3 w-16 h-6 bg-gray-300 rounded-full"></div>
        <div className="absolute bottom-3 left-3 w-20 h-6 bg-gray-300 rounded"></div>
      </div>
      
      <div className="p-6">
        {/* Category and rating skeleton */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-20 h-4 bg-gray-200 rounded"></div>
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="w-4 h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="w-8 h-4 bg-gray-200 rounded ml-2"></div>
          </div>
        </div>
        
        {/* Title and subtitle skeleton */}
        <div className="space-y-2 mb-3">
          <div className="w-full h-5 bg-gray-200 rounded"></div>
          <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
        </div>
        
        {/* Instructor skeleton */}
        <div className="flex items-center mb-4">
          <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
          <div className="w-24 h-4 bg-gray-200 rounded"></div>
        </div>
        
        {/* Meta info skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-4 bg-gray-200 rounded"></div>
            <div className="w-16 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="w-12 h-6 bg-gray-200 rounded-full"></div>
        </div>
        
        {/* Price skeleton */}
        <div className="mb-4">
          <div className="w-16 h-6 bg-gray-200 rounded"></div>
        </div>
        
        {/* Buttons skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2 flex-1">
            <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-lg ml-2"></div>
        </div>
      </div>
    </div>
  );
};

const SkeletonGrid = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
};

export { SkeletonCard, SkeletonGrid };
