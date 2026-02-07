import React, { useState, useRef } from 'react';

const VideoPlayer = ({ 
    src, 
    alt = "Course Video", 
    className = "", 
    poster = null,
    controls = true,
    autoPlay = false,
    muted = true,
    loop = false,
    width = "100%",
    height = "200px",
    fallbackImage = null,
    onError = null 
}) => {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const videoRef = useRef(null);

    const handleVideoError = (e) => {
        console.error('[VideoPlayer] Video failed to load:', {
            src,
            error: e.target.error,
            networkState: e.target.networkState,
            readyState: e.target.readyState
        });
        setHasError(true);
        setIsLoading(false);
        if (onError) {
            onError(e);
        }
    };

    const handleVideoLoad = () => {
        console.log('[VideoPlayer] Video loaded successfully:', src);
        setIsLoading(false);
        setHasError(false);
    };

    const handleVideoLoadStart = () => {
        console.log('[VideoPlayer] Video loading started:', src);
        setIsLoading(true);
    };

    // If video has error or no src, show fallback image
    if (hasError || !src) {
        return (
            <div className={`relative ${className}`} style={{ width, height }}>
                {fallbackImage ? (
                    <img 
                        src={fallbackImage}
                        alt={alt}
                        className="w-full h-full object-cover rounded-lg"
                        onError={() => {
                            // If fallback image also fails, show default placeholder
                            const target = event.target;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVMMTc1IDEyNUgxMjVIMTAwTDEyNSA3NVoiIGZpbGw9IiNEMUQ1REIiLz4KPHRleHQgeD0iMTUwIiB5PSIxNjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2QjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
                        }}
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-500">
                            <svg 
                                className="w-12 h-12 mx-auto mb-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={1.5}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                            </svg>
                            <p className="text-sm">Video Unavailable</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`relative ${className}`} style={{ width, height }}>
            {isLoading && (
                <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center z-10">
                    <div className="flex items-center space-x-2 text-gray-600">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                        <span className="text-sm">Loading video...</span>
                    </div>
                </div>
            )}
            
            <video
                ref={videoRef}
                className="w-full h-full object-cover rounded-lg"
                controls={controls}
                autoPlay={autoPlay}
                muted={muted}
                loop={loop}
                poster={poster}
                onError={handleVideoError}
                onLoadedData={handleVideoLoad}
                onLoadStart={handleVideoLoadStart}
                preload="metadata"
                crossOrigin="anonymous"
                playsInline
            >
                <source src={src} type="video/mp4" />
                <source src={src} type="video/webm" />
                <source src={src} type="video/ogg" />
                <source src={src} type="video/avi" />
                <source src={src} type="video/quicktime" />
                Your browser does not support the video tag.
            </video>
            
            {/* Video overlay controls */}
            {!isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
                    <button
                        onClick={() => {
                            if (videoRef.current) {
                                if (videoRef.current.paused) {
                                    videoRef.current.play();
                                } else {
                                    videoRef.current.pause();
                                }
                            }
                        }}
                        className="bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-all duration-200"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;