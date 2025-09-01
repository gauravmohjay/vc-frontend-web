// VideoComponent.jsx
import { useEffect, useState, useRef } from "react";
import * as LivekitClient from "livekit-client";

const VideoComponent = ({ socket, scheduleId, role, userId, username }) => {
  const [room, setRoom] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isCamOn, setIsCamOn] = useState(false);
  const [participants, setParticipants] = useState(new Map());

  // Enhanced Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [isHostCameraRecording, setIsHostCameraRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [recordingType, setRecordingType] = useState(null); // 'room', 'screen', 'host-camera'

  // Screen sharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const videosRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleLivekitAuth = async ({ url, token }) => {
      const newRoom = new LivekitClient.Room({ autoSubscribe: true });

      newRoom
        .on("participantConnected", (p) => {
          console.log("Participant connected:", p.identity);
          addPlaceholder(p.identity);
        })
        .on("participantDisconnected", (p) => {
          removeTile(p.identity);
        })
        .on("trackSubscribed", (track, pub, participant) => {
          attachTrack(track, participant.identity);
        })
        .on("trackUnsubscribed", (track, pub, participant) => {
          detachTrack(track, participant.identity);
        })
        // Track screen share status
        .on("trackPublished", (pub, participant) => {
          if (
            participant.identity === newRoom.localParticipant.identity &&
            pub.source === "screen_share"
          ) {
            setIsScreenSharing(true);
            console.log("Screen share track published");
          }
        })
        .on("trackUnpublished", (pub, participant) => {
          if (
            participant.identity === newRoom.localParticipant.identity &&
            pub.source === "screen_share"
          ) {
            setIsScreenSharing(false);
            console.log("Screen share track unpublished");
          }
        });

      await newRoom.connect(url, token);
      setRoom(newRoom);

      // Add self tile
      addPlaceholder(newRoom.localParticipant.identity);
      console.log("setRoom->", room);
      console.log("setRoom->newRoom", newRoom);

      newRoom?.remoteParticipants?.forEach((id, participant) => {
        console.log("Existing participant:", participant);
        addPlaceholder(participant);

        participant?.tracks?.forEach((pub) => {
          if (pub.isSubscribed && pub.track) {
            attachTrack(pub.track, participant.identity);
          }
        });
      });
    };

    // Enhanced Recording Status Handler
    const handleRecordingStatus = (status) => {
      console.log("📊 Recording status update:", status);

      // Reset all recording states first
      setIsRecording(false);
      setIsScreenRecording(false);
      setIsHostCameraRecording(false);

      if (status.isRecording) {
        setRecordingType(status.recordingType);

        // Set appropriate recording state based on type
        switch (status.recordingType) {
          case "room":
            setIsRecording(true);
            break;
          case "screen":
            setIsScreenRecording(true);
            break;
          case "host-camera":
            setIsHostCameraRecording(true);
            break;
          default:
            setIsRecording(true); // fallback
        }

        if (status.startTime) {
          setRecordingStartTime(new Date(status.startTime));
        }
      } else {
        setRecordingType(null);
        setRecordingStartTime(null);
      }
    };

    // Room Recording Event Handlers
    const handleRoomRecordingStarted = (result) => {
      setIsRecording(true);
      setRecordingType("room");
      setRecordingStartTime(new Date());
      console.log("🎥 Room recording started:", result);
      alert(`Room recording started: ${result.filename}`);
    };

    const handleRoomRecordingStopped = (result) => {
      setIsRecording(false);
      setRecordingType(null);
      setRecordingStartTime(null);
      console.log("🎥 Room recording stopped:", result);
      alert(`Room recording saved as: ${result.filename}`);
    };

    // Screen Recording Event Handlers
    const handleScreenRecordingStarted = (result) => {
      setIsScreenRecording(true);
      setRecordingType("screen");
      setRecordingStartTime(new Date());
      console.log("🖥️ Screen recording started:", result);
      alert(`Screen recording started: ${result.filename}`);
    };

    const handleScreenRecordingStopped = (result) => {
      setIsScreenRecording(false);
      setRecordingType(null);
      setRecordingStartTime(null);
      console.log("🖥️ Screen recording stopped:", result);
      alert(`Screen recording saved as: ${result.filename}`);
    };

    // Host Camera Recording Event Handlers
    const handleHostCameraRecordingStarted = (result) => {
      setIsHostCameraRecording(true);
      setRecordingType("host-camera");
      setRecordingStartTime(new Date());
      console.log("📹 Host camera recording started:", result);
      alert(`Host camera recording started: ${result.filename}`);
    };

    const handleHostCameraRecordingStopped = (result) => {
      setIsHostCameraRecording(false);
      setRecordingType(null);
      setRecordingStartTime(null);
      console.log("📹 Host camera recording stopped:", result);
      alert(`Host camera recording saved as: ${result.filename}`);
    };

    // Generic Recording Stopped Handler
    const handleRecordingStopped = (result) => {
      // Reset all recording states
      setIsRecording(false);
      setIsScreenRecording(false);
      setIsHostCameraRecording(false);
      setRecordingType(null);
      setRecordingStartTime(null);
      console.log("⏹️ Recording stopped:", result);
      alert(`Recording saved as: ${result.filename}`);
    };

    // Error Handler
    const handleRecordingError = (error) => {
      console.error("❌ Recording error:", error);
      alert(`Recording error: ${error.message}`);

      // Reset states on error
      setIsRecording(false);
      setIsScreenRecording(false);
      setIsHostCameraRecording(false);
      setRecordingType(null);
      setRecordingStartTime(null);
    };

    // Socket event listeners - Updated for new events
    socket.on("livekit-auth", handleLivekitAuth);
    socket.on("recordingStatus", handleRecordingStatus);

    // Room recording events
    socket.on("roomRecordingStarted", handleRoomRecordingStarted);
    socket.on("roomRecordingStopped", handleRoomRecordingStopped);

    // Screen recording events
    socket.on("screenRecordingStarted", handleScreenRecordingStarted);
    socket.on("screenRecordingStopped", handleScreenRecordingStopped);

    // Host camera recording events
    socket.on("hostCameraRecordingStarted", handleHostCameraRecordingStarted);
    socket.on("hostCameraRecordingStopped", handleHostCameraRecordingStopped);

    // Generic events (backward compatibility)
    socket.on("recordingStarted", handleRoomRecordingStarted); // fallback
    socket.on("recordingStopped", handleRecordingStopped);
    socket.on("recordingError", handleRecordingError);

    // Get initial recording status
    if (role === "host") {
      socket.emit("getRecordingStatus", { scheduleId });
    }

    return () => {
      // Cleanup all event listeners
      socket.off("livekit-auth", handleLivekitAuth);
      socket.off("recordingStatus", handleRecordingStatus);
      socket.off("roomRecordingStarted", handleRoomRecordingStarted);
      socket.off("roomRecordingStopped", handleRoomRecordingStopped);
      socket.off("screenRecordingStarted", handleScreenRecordingStarted);
      socket.off("screenRecordingStopped", handleScreenRecordingStopped);
      socket.off(
        "hostCameraRecordingStarted",
        handleHostCameraRecordingStarted
      );
      socket.off(
        "hostCameraRecordingStopped",
        handleHostCameraRecordingStopped
      );
      socket.off("recordingStarted", handleRoomRecordingStarted);
      socket.off("recordingStopped", handleRecordingStopped);
      socket.off("recordingError", handleRecordingError);

      if (room) {
        room.disconnect();
      }
    };
  }, [socket, scheduleId, role]);

  // Existing functions remain unchanged
  const addPlaceholder = (identity) => {
    setParticipants((prev) => {
      if (!prev.has(identity)) {
        const newMap = new Map(prev);
        newMap.set(identity, {
          identity,
          hasVideo: false,
          videoElement: null,
          audioElement: null,
        });
        return newMap;
      }
      return prev;
    });
  };

  const attachTrack = async (track, identity) => {
    const el = track.attach();
    el.id = `media-${identity}-${track.kind}`;
    el.autoplay = true;
    el.playsInline = true;

    if (track.kind === "video") {
      setParticipants((prev) => {
        const newMap = new Map(prev);
        const p = newMap.get(identity) || { identity };
        p.hasVideo = true;
        p.videoElement = el;
        newMap.set(identity, p);
        return newMap;
      });
    } else if (track.kind === "audio") {
      el.muted = identity === room?.localParticipant?.identity;
      try {
        await el.play();
      } catch (err) {
        console.warn("Autoplay blocked:", err);
      }
      document.body.appendChild(el);
      setParticipants((prev) => {
        const newMap = new Map(prev);
        const p = newMap.get(identity) || { identity };
        p.audioElement = el;
        newMap.set(identity, p);
        return newMap;
      });
    }
  };

  const detachTrack = (track, identity) => {
    const el = document.getElementById(`media-${identity}-${track.kind}`);
    if (el) {
      track.detach(el);
      el.remove();
    }
    if (track.kind === "video") {
      setParticipants((prev) => {
        const newMap = new Map(prev);
        const p = newMap.get(identity);
        if (p) {
          p.hasVideo = false;
          p.videoElement = null;
          newMap.set(identity, p);
        }
        return newMap;
      });
    }
  };

  const removeTile = (identity) => {
    setParticipants((prev) => {
      const newMap = new Map(prev);
      newMap.delete(identity);
      return newMap;
    });
  };

  // === Existing Media Controls (Unchanged) ===
  const toggleMute = async () => {
    if (!room) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (!room.localParticipant.microphoneTrack) {
      const [micTrack] = await LivekitClient.createLocalTracks({ audio: true });
      await room.localParticipant.publishTrack(micTrack);
    }
    room.localParticipant.setMicrophoneEnabled(!newMuted);
  };

  const toggleCamera = async () => {
    if (!room) return;
    const newState = !isCamOn;
    setIsCamOn(newState);

    if (!room.localParticipant.cameraTrack && newState) {
      const [camTrack] = await LivekitClient.createLocalTracks({ video: true });
      await room.localParticipant.publishTrack(camTrack);
      attachTrack(camTrack, room.localParticipant.identity);
    } else {
      room.localParticipant.setCameraEnabled(newState);
    }
  };

  const shareScreen = async () => {
    if (!room) return;

    try {
      if (!isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
        console.log("✅ Screen sharing started");
      } else {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        console.log("🛑 Screen sharing stopped");

        // Auto-stop screen recording if active
        if (isScreenRecording) {
          stopScreenRecording();
        }
      }
    } catch (err) {
      console.error("❌ Screen sharing error:", err);
      alert(
        "Failed to start screen sharing. Please check browser permissions."
      );
      setIsScreenSharing(false);
    }
  };

  // === Updated Recording Controls ===

  // Room Recording Controls
  const startRoomRecording = () => {
    if (role !== "host" || !socket) return;

    socket.emit("startRoomRecording", {
      scheduleId,
      userId,
      username,
      role,
      layout: "grid", // Grid layout shows placeholders well
      preset: "H264_1080P_30",
      audioOnly: false, // Include video (with placeholders)
      videoOnly: false,
    });
  };

  const stopRoomRecording = () => {
    if (role !== "host" || !socket) return;

    socket.emit("stopRoomRecording", {
      scheduleId,
      userId,
      username,
      role,
    });
  };

  // Screen Recording Controls
  const startScreenRecording = () => {
    if (role !== "host" || !socket) return;

    if (!isScreenSharing) {
      alert("Please start screen sharing first before recording your screen.");
      return;
    }

    socket.emit("startScreenRecording", {
      scheduleId,
      userId,
      username,
      role,
      preset: "HD_1080P_30",
    });
  };

  const stopScreenRecording = () => {
    if (role !== "host" || !socket) return;

    socket.emit("stopScreenRecording", {
      scheduleId,
      userId,
      username,
      role,
    });
  };

  // Host Camera Recording Controls
  const startHostCameraRecording = () => {
    if (role !== "host" || !socket) return;

    socket.emit("startHostCameraRecording", {
      scheduleId,
      userId,
      username,
      role,
      preset: "HD_1080P_30",
      includeAudio: true,
    });
  };

  const stopHostCameraRecording = () => {
    if (role !== "host" || !socket) return;

    socket.emit("stopHostCameraRecording", {
      scheduleId,
      userId,
      username,
      role,
    });
  };

  // Universal Stop Recording
  const stopRecording = () => {
    if (role !== "host" || !socket) return;

    socket.emit("stopRecording", {
      scheduleId,
      userId,
      username,
      role,
    });
  };

  // === UI Components ===
  const ParticipantTile = ({ participant }) => {
    const tileRef = useRef(null);

    useEffect(() => {
      if (tileRef.current) {
        tileRef.current.innerHTML = "";
        if (participant.hasVideo && participant.videoElement) {
          tileRef.current.appendChild(participant.videoElement);
        } else {
          const ph = document.createElement("div");
          ph.className = "placeholder";
          ph.innerText = participant.identity.toUpperCase();
          tileRef.current.appendChild(ph);
        }
      }
    }, [participant]);

    return (
      <div id={`tile-${participant.identity}`} className="tile" ref={tileRef}>
        {!participant.hasVideo && (
          <div className="placeholder">
            {participant.identity.toUpperCase()}
          </div>
        )}
      </div>
    );
  };

  // Enhanced Recording Indicator
  const RecordingIndicator = () => {
    if (!isRecording && !isScreenRecording && !isHostCameraRecording)
      return null;

    let recordingText = "Recording";
    let bgColor = "#ff4444";

    if (isScreenRecording) {
      recordingText = "Screen Recording";
      bgColor = "#9333ea";
    } else if (isHostCameraRecording) {
      recordingText = "Host Camera Recording";
      bgColor = "#059669";
    } else if (isRecording) {
      recordingText = "Room Recording";
      bgColor = "#ff4444";
    }

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: bgColor,
          color: "white",
          padding: "8px 16px",
          borderRadius: "4px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            background: "white",
            borderRadius: "50%",
            animation: "blink 1s infinite",
          }}
        ></div>
        <span>{recordingText} in progress...</span>
        {recordingStartTime && (
          <span style={{ fontSize: "12px", opacity: 0.9 }}>
            Started: {recordingStartTime.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  };

  const isAnyRecording =
    isRecording || isScreenRecording || isHostCameraRecording;

  return (
    <div className="video-component">
      {/* Recording indicator visible to all */}
      <RecordingIndicator />

      <div className="controls">
        <button onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
        <button onClick={toggleCamera}>{isCamOn ? "Cam Off" : "Cam On"}</button>
        <button onClick={shareScreen}>
          {isScreenSharing ? "Stop Screen Share" : "Share Screen"}
        </button>

        {/* Enhanced Recording controls - only visible to hosts */}
        {role === "host" && (
          <>
            {/* Room Recording Controls */}
            <button
              onClick={startRoomRecording}
              disabled={isAnyRecording}
              style={{
                background: isRecording ? "#86efac" : "#22c55e",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: isAnyRecording ? "not-allowed" : "pointer",
              }}
            >
              {isRecording ? "Recording Room..." : "Record Room"}
            </button>

            {/* Screen Recording Controls */}
            <button
              onClick={startScreenRecording}
              disabled={isAnyRecording || !isScreenSharing}
              style={{
                background: isScreenRecording ? "#c084fc" : "#9333ea",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor:
                  isAnyRecording || !isScreenSharing
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {isScreenRecording ? "Recording Screen..." : "Record Screen"}
            </button>

            {/* Universal Stop Recording */}
            <button
              onClick={stopRecording}
              disabled={!isAnyRecording}
              style={{
                background: !isAnyRecording ? "#fca5a5" : "#ef4444",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: !isAnyRecording ? "not-allowed" : "pointer",
              }}
            >
              Stop Recording
            </button>
          </>
        )}
      </div>

      <div id="videos" className="videos" ref={videosRef}>
        {Array.from(participants.values()).map((p) => (
          <ParticipantTile key={p.identity} participant={p} />
        ))}
      </div>

      {/* Add CSS for blinking animation */}
      <style jsx>{`
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoComponent;
