import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';

const APP_ID = "615d6aeeb5424278ba7f08af23a05a36"; // Hardcoded for now from agora.py
const API_BASE_URL = 'http://localhost:4000';

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

const StudentLiveClass = () => {
    const { id: sessionId } = useParams();
    const navigate = useNavigate();
    const [joined, setJoined] = useState(false);
    const [localTracks, setLocalTracks] = useState([]);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [micOn, setMicOn] = useState(false); // Students usually start muted
    const [cameraOn, setCameraOn] = useState(false); // Students usually start with camera off
    const [loading, setLoading] = useState(true);
    const [sessionDetails, setSessionDetails] = useState(null);

    const localVideoRef = useRef(null);

    useEffect(() => {
        fetchSessionAndJoin();
        return () => {
            leaveChannel();
        };
    }, []);

    const fetchSessionAndJoin = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                toast.error("Authentication required");
                navigate('/student/login');
                return;
            }

            console.log('Attempting to join session:', sessionId);
            
            // 1. Get Token and Channel Name
            const response = await axios.get(`${API_BASE_URL}/api/live-sessions/generate-token/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('Token response:', response.data);
            
            const { token: agoraToken, channel, uid } = response.data;
            
            if (!agoraToken || !channel) {
                throw new Error('Invalid token or channel information received');
            }

            // 2. Join Agora Channel
            await joinChannel(agoraToken, channel, uid);

            setSessionDetails({ channel, uid });
            setLoading(false);

        } catch (error) {
            console.error("Failed to join live session", error);
            console.error("Error details:", error.response?.data || error.message);
            
            let errorMessage = "Failed to join live session";
            if (error.response?.status === 404) {
                errorMessage = "Session not found or has ended";
            } else if (error.response?.status === 403) {
                errorMessage = "Access denied to this session";
            } else if (error.response?.data?.detail) {
                errorMessage = error.response.data.detail;
            } else {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
            navigate('/students'); // Redirect back to dashboard
        }
    };

    const joinChannel = async (token, channel, uid) => {
        try {
            client.on("user-published", handleUserPublished);
            client.on("user-unpublished", handleUserUnpublished);

            await client.join(APP_ID, channel, token, uid);
            setJoined(true);
            toast.success("Joined Live Class");

            // Students typically act as audience first, or publish if interactive
            // For now, let's allow them to publish but default to off
        } catch (error) {
            console.error("Failed to join Agora channel", error);
            toast.error("Failed to connect to live class: " + error.message);
            navigate('/students');
        }
    };

    const handleUserPublished = async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        console.log("Subscribed to user:", user.uid);

        if (mediaType === "video") {
            setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
        }
        if (mediaType === "audio") {
            user.audioTrack.play();
        }
    };

    const handleUserUnpublished = (user, mediaType) => {
        if (mediaType === "video") {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        }
    };

    const toggleMic = async () => {
        if (localTracks[0]) {
            await localTracks[0].setEnabled(!micOn);
            setMicOn(!micOn);
        } else {
            // Create audio track if not exists
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            await client.publish(audioTrack);
            setLocalTracks(prev => [audioTrack, ...prev.slice(1)]);
            setMicOn(true);
        }
    };

    const toggleCamera = async () => {
        if (localTracks[1]) {
            await localTracks[1].setEnabled(!cameraOn);
            setCameraOn(!cameraOn);
        } else {
            // Create video track
            const videoTrack = await AgoraRTC.createCameraVideoTrack();
            await client.publish(videoTrack);
            setLocalTracks(prev => [prev[0], videoTrack]);
            setCameraOn(true);
            videoTrack.play(localVideoRef.current);
        }
    };

    const leaveChannel = async () => {
        localTracks.forEach(track => {
            track.stop();
            track.close();
        });
        setLocalTracks([]);
        await client.leave();
        client.removeAllListeners();
        setJoined(false);
        navigate('/students');
    };

    // Effect to play remote videos
    useEffect(() => {
        remoteUsers.forEach(user => {
            if (user.videoTrack) {
                // Find a container or create one dynamically?
                // For simplicity, we assume one teacher or a grid.
                // We'll render them in the return.
                const el = document.getElementById(`user-video-${user.uid}`);
                if (el) user.videoTrack.play(el);
            }
        });
    }, [remoteUsers]);

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Header */}
            <div className="p-4 bg-gray-800 flex justify-between items-center shadow-md">
                <h1 className="text-xl font-bold">Live Class: {sessionDetails?.channel}</h1>
                <div className="bg-red-600 text-xs px-2 py-1 rounded animate-pulse">LIVE</div>
            </div>

            {/* Main Video Area */}
            <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Main Stage (Teacher/Screen Share) - taking 3/4 space */}
                <div className="md:col-span-3 bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-700">
                    {remoteUsers.length === 0 ? (
                        <div className="text-center p-8">
                            <div className="animate-pulse text-6xl mb-4">🎥</div>
                            <p className="text-gray-400 text-lg">Waiting for instructor to join...</p>
                        </div>
                    ) : (
                        // Assume first remote user is teacher for now
                        <div id={`user-video-${remoteUsers[0].uid}`} className="w-full h-full object-cover"></div>
                    )}
                </div>

                {/* Sidebar (Chat / Participants / Self View) */}
                <div className="md:col-span-1 flex flex-col gap-4">
                    {/* Self View */}
                    <div className="h-48 bg-gray-800 rounded-xl overflow-hidden relative border border-gray-700">
                        <div ref={localVideoRef} className="w-full h-full bg-black">
                            {!cameraOn && <div className="flex items-center justify-center h-full text-gray-500">Camera Off</div>}
                        </div>
                        <div className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">You</div>
                    </div>

                    {/* Other Remote Users Grid (if many) */}
                    <div className="flex-1 bg-gray-800 rounded-xl p-2 overflow-y-auto border border-gray-700">
                        <h3 className="text-sm font-semibold mb-2 text-gray-400">Classmates ({remoteUsers.length})</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {remoteUsers.slice(1).map(user => (
                                <div key={user.uid} id={`user-video-${user.uid}`} className="bg-black aspect-video rounded-lg overflow-hidden relative">
                                    <div className="absolute bottom-1 left-1 text-[10px] bg-black/50 px-1 rounded text-white">{user.uid}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="p-4 bg-gray-800 flex justify-center gap-6 shadow-lg border-t border-gray-700">
                <button
                    onClick={toggleMic}
                    className={`p-4 rounded-full transition-colors ${micOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
                >
                    {micOn ? <FaMicrophone size={24} /> : <FaMicrophoneSlash size={24} />}
                </button>

                <button
                    onClick={toggleCamera}
                    className={`p-4 rounded-full transition-colors ${cameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
                >
                    {cameraOn ? <FaVideo size={24} /> : <FaVideoSlash size={24} />}
                </button>

                <button
                    onClick={leaveChannel}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold flex items-center gap-2 transition shadow-lg shadow-red-900/20"
                >
                    <FaPhoneSlash /> Leave Class
                </button>
            </div>
        </div>
    );
};

export default StudentLiveClass;
