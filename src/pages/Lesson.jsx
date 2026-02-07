import { useParams } from 'react-router-dom';
import { useState } from 'react';

const courseVideos = {
  1: '/vid.mp4',
  2: '/vid1.mp4',
  3: '/vid2.mp4',
  4: '/vid.mp4',
  5: '/vid1.mp4',
  6: '/vid2.mp4',
};

const Lesson = () => {
  const { id } = useParams();
  const videoUrl = courseVideos[id] || 'https://www.w3schools.com/html/mov_bbb.mp4';
  const [resumeTime, setResumeTime] = useState(0);

  const handleTimeUpdate = (e) => {
    setResumeTime(e.target.currentTime);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8 border-t-4 border-orange-400 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-orange-800 mb-6">English Course Video</h2>
        <video
          src={videoUrl}
          controls
          className="w-full h-96 rounded-xl bg-black mb-4"
          onTimeUpdate={handleTimeUpdate}
          autoPlay
        >
          Your browser does not support the video tag.
        </video>
        <div className="text-orange-700 font-semibold text-center">Resumed at: {Math.floor(resumeTime)} seconds</div>
      </div>
    </div>
  );
};

export default Lesson;
