import React from 'react';

const RatingStars = ({ rating = 0, maxRating = 5, showRating = true, size = 'sm', reviewCount = null }) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className="flex items-center space-x-1">
      <div className="flex items-center">
        {Array.from({ length: maxRating }, (_, index) => {
          const starNumber = index + 1;
          const isFilled = starNumber <= Math.floor(rating);
          const isHalfFilled = starNumber === Math.ceil(rating) && rating % 1 !== 0;

          return (
            <div key={index} className="relative">
              {/* Background star */}
              <svg
                className={`${sizeClasses[size]} text-gray-200`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              
              {/* Filled star */}
              {(isFilled || isHalfFilled) && (
                <div className="absolute top-0 left-0 overflow-hidden" style={{ width: isHalfFilled ? '50%' : '100%' }}>
                  <svg
                    className={`${sizeClasses[size]} text-yellow-400`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {showRating && (
        <div className="flex items-center space-x-1">
          <span className={`font-medium text-gray-700 ${textSizeClasses[size]}`}>
            {rating.toFixed(1)}
          </span>
          {reviewCount !== null && (
            <span className={`text-gray-500 ${textSizeClasses[size]}`}>
              ({reviewCount})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RatingStars;
