import React, { useEffect, useState } from 'react';

const Timer = ({ duration = 300 }) => {
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);

    const formatTime = (sec) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

    return <div className="mb-4 text-red-600 font-bold">⏱️ Time Left: {formatTime(timeLeft)}</div>;
};

export default Timer;
