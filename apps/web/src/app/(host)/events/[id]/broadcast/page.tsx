'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SoundBoard } from '@/components/host/SoundBoard';
import { ViewerPanel } from '@/components/host/ViewerPanel';
import { ChatModeration } from '@/components/host/ChatModeration';

interface EventData {
  id: string;
  title: string;
  slug: string;
  status: string;
  streamKey: string;
  playbackUrl: string;
}

export default function BroadcastPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'idle' | 'connecting' | 'live'>('idle');
  const [testStreamRunning, setTestStreamRunning] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchEvent();
    return () => {
      stopCamera();
    };
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
      } else {
        setError('Failed to load event');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setCameraLoading(true);
      console.log('Requesting camera access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      console.log('Got stream:', stream);
      console.log('Video tracks:', stream.getVideoTracks());

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        try {
          await videoRef.current.play();
          console.log('Video playing');
        } catch (playErr) {
          console.log('Autoplay handled by browser');
        }
      }

      setCameraReady(true);
      setCameraLoading(false);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraLoading(false);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is in use by another application. Please close other apps using the camera.');
      } else {
        setError(`Camera error: ${err.message || err.name || 'Unknown error'}`);
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const startStreaming = async () => {
    if (!mediaStreamRef.current || !event) return;

    setStreamStatus('connecting');

    try {
      const token = localStorage.getItem('accessToken');

      // Try to set the event to live (skip if already live)
      if (event.status === 'scheduled') {
        const goLiveRes = await fetch(`http://localhost:4000/api/events/${eventId}/go-live`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!goLiveRes.ok) {
          const errData = await goLiveRes.json();
          throw new Error(errData.message || 'Failed to go live');
        }
      }

      // Connect to our WebSocket relay server
      const ws = new WebSocket(`ws://localhost:4000/stream-relay?streamKey=${event.streamKey}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to stream relay');

        // Start MediaRecorder
        const mediaRecorder = new MediaRecorder(mediaStreamRef.current!, {
          mimeType: 'video/webm;codecs=vp8,opus',
          videoBitsPerSecond: 2500000,
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };

        mediaRecorder.start(1000); // Send data every second
        mediaRecorderRef.current = mediaRecorder;

        setIsStreaming(true);
        setStreamStatus('live');
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Stream connection failed');
        setStreamStatus('idle');
      };

      ws.onclose = () => {
        console.log('Stream relay disconnected');
        if (isStreaming) {
          setIsStreaming(false);
          setStreamStatus('idle');
        }
      };

    } catch (err) {
      console.error('Streaming error:', err);
      setError((err as Error).message);
      setStreamStatus('idle');
    }
  };

  const stopStreaming = async () => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // End the event
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/events/${eventId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Failed to end event:', err);
    }

    setIsStreaming(false);
    setStreamStatus('idle');
  };

  const startTestStream = async () => {
    try {
      setStreamStatus('connecting');
      setError(null);
      const token = localStorage.getItem('accessToken');

      // Try to go live first (will fail if already live, that's ok)
      if (event?.status === 'scheduled') {
        await fetch(`http://localhost:4000/api/events/${eventId}/go-live`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const res = await fetch(`http://localhost:4000/api/events/${eventId}/test-stream`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setTestStreamRunning(true);
        setStreamStatus('live');
        setError(null);
        // Refresh event data
        fetchEvent();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to start test stream');
        setStreamStatus('idle');
      }
    } catch (err) {
      setError('Failed to connect to server');
      setStreamStatus('idle');
    }
  };

  const stopTestStream = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/events/${eventId}/stop-test-stream`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setTestStreamRunning(false);
      setStreamStatus('idle');
    } catch (err) {
      console.error('Failed to stop test stream:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/dashboard" className="text-primary-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
              ← Back
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-white truncate max-w-[200px] sm:max-w-none">{event?.title}</h1>
            {streamStatus === 'live' && (
              <span className="flex items-center gap-1 sm:gap-2 bg-red-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {event && (
              <Link
                href={`/e/${event.slug || event.id}`}
                target="_blank"
                className="text-gray-400 hover:text-white text-xs sm:text-sm"
              >
                View as Viewer →
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-6">
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 lg:mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Camera Preview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <div className="aspect-video bg-black relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!cameraReady && !cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-400">Camera preview will appear here</p>
                    </div>
                  </div>
                )}
                {cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400">Accessing camera...</p>
                    </div>
                  </div>
                )}
                {streamStatus === 'connecting' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white">Connecting to stream...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex flex-col items-center gap-4">
                  {/* Test Stream Controls */}
                  {!testStreamRunning ? (
                    <button
                      onClick={startTestStream}
                      disabled={streamStatus === 'connecting'}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                      {streamStatus === 'connecting' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <span className="w-3 h-3 bg-white rounded-full"></span>
                          Start Test Stream
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={stopTestStream}
                      className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2"
                    >
                      <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                      Stop Test Stream
                    </button>
                  )}

                  {testStreamRunning && (
                    <p className="text-green-400 text-sm">
                      Test stream is running! View it at{' '}
                      <Link href={`/e/${event?.slug || event?.id}`} target="_blank" className="underline">
                        the viewer page
                      </Link>
                    </p>
                  )}

                  {/* Camera Controls (browser streaming) */}
                  <div className="border-t border-gray-700 pt-4 mt-2 w-full">
                    <p className="text-gray-400 text-sm text-center mb-3">Or stream from your camera:</p>
                    <div className="flex items-center justify-center gap-4">
                      {!cameraReady ? (
                        <button
                          onClick={startCamera}
                          disabled={cameraLoading}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                          {cameraLoading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Accessing Camera...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Enable Camera
                            </>
                          )}
                        </button>
                      ) : !isStreaming ? (
                        <>
                          <button
                            onClick={stopCamera}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Disable Camera
                          </button>
                          <button
                            onClick={startStreaming}
                            disabled={streamStatus === 'connecting' || testStreamRunning}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                          >
                            <span className="w-3 h-3 bg-white rounded-full"></span>
                            Go Live with Camera
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={stopStreaming}
                          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                        >
                          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                          End Camera Stream
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4 lg:space-y-6">
            {/* Viewer Panel */}
            {event && <ViewerPanel eventId={event.id} />}

            {/* Chat Moderation */}
            {event && <ChatModeration eventId={event.id} />}

            {/* Sound Board */}
            {event && (
              <SoundBoard
                eventId={event.id}
                disabled={streamStatus !== 'live' && !testStreamRunning}
              />
            )}

            {/* Stream Info */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Stream Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className={`ml-2 ${streamStatus === 'live' ? 'text-red-400' : 'text-gray-300'}`}>
                    {streamStatus === 'live' ? '🔴 Live' : streamStatus === 'connecting' ? '🟡 Connecting...' : '⚪ Offline'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Event:</span>
                  <span className="ml-2 text-gray-300">{event?.title}</span>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Tips</h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Make sure you have good lighting</li>
                <li>• Use a stable internet connection</li>
                <li>• Test your audio before going live</li>
                <li>• Close other apps using your camera</li>
              </ul>
            </div>

            {/* External Streaming Option */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Advanced: Use OBS</h3>
              <p className="text-sm text-gray-400 mb-3">
                For professional streaming with scenes and overlays, use OBS Studio:
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-500">Server:</span>
                  <code className="ml-2 text-gray-300 bg-gray-700 px-2 py-1 rounded">
                    rtmps://global-live.mux.com:443/app
                  </code>
                </div>
                <div>
                  <span className="text-gray-500">Stream Key:</span>
                  <code className="ml-2 text-gray-300 bg-gray-700 px-2 py-1 rounded text-xs break-all">
                    {event?.streamKey}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
