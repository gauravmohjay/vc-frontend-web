// VideoComponent.jsx
import { useEffect, useState, useRef } from "react";
import * as LivekitClient from "livekit-client";

const VideoComponent = ({
  socket,
  scheduleId,
  role,
  userId,
  username,
}) => {
  const [room, setRoom] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isCamOn, setIsCamOn] = useState(false);
  const [participants, setParticipants] = useState(new Map());

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState(null);

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
        });

      await newRoom.connect(url, token);
      setRoom(newRoom);

      // Add self tile
      addPlaceholder(newRoom.localParticipant.identity);

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

    // Recording event handlers
    const handleRecordingStatus = (status) => {
      setIsRecording(status.isRecording);
      if (status.isRecording && status.startTime) {
        setRecordingStartTime(new Date(status.startTime));
      } else {
        setRecordingStartTime(null);
      }
    };

    const handleRecordingStarted = (result) => {
      setIsRecording(true);
      setRecordingStartTime(new Date());
      console.log("Recording started:", result);
    };

    const handleRecordingStopped = (result) => {
      setIsRecording(false);
      setRecordingStartTime(null);
      console.log("Recording stopped:", result);
      alert(`Recording saved as: ${result.filename}`);
    };

    const handleRecordingError = (error) => {
      console.error("Recording error:", error.message);
      alert(`Recording error: ${error.message}`);
    };

    // Socket event listeners
    socket.on("livekit-auth", handleLivekitAuth);
    socket.on("recordingStatus", handleRecordingStatus);
    socket.on("recordingStarted", handleRecordingStarted);
    socket.on("recordingStopped", handleRecordingStopped);
    socket.on("recordingError", handleRecordingError);

    // Get initial recording status
    if (role === "host") {
      socket.emit("getRecordingStatus", { scheduleId });
    }

    return () => {
      socket.off("livekit-auth", handleLivekitAuth);
      socket.off("recordingStatus", handleRecordingStatus);
      socket.off("recordingStarted", handleRecordingStarted);
      socket.off("recordingStopped", handleRecordingStopped);
      socket.off("recordingError", handleRecordingError);

      if (room) {
        room.disconnect();
      }
    };
  }, [socket, scheduleId, role]);

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

  // === Existing Controls ===
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
      await room.localParticipant.setScreenShareEnabled(true);
      const tracks = await LivekitClient.createLocalTracks({ screen: true });
      for (const t of tracks) {
        await room.localParticipant.publishTrack(t);
        attachTrack(t, `${room.localParticipant.identity}-screen`);
      }
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  // === Recording Controls (Host Only) ===
  const startRecording = () => {
    if (role !== "host" || !socket) return;

    socket.emit("startRecording", {
      scheduleId,
      userId,
      username,
      role: role,
      layout: "speaker",
    });
  };

  const stopRecording = () => {
    if (role !== "host" || !socket) return;

    socket.emit("stopRecording", {
      scheduleId,
      userId,
      username,
      role: role,
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

  // Recording indicator for all users
  const RecordingIndicator = () => {
    if (!isRecording) return null;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "#ff4444",
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
        <span>Recording in progress...</span>
        {recordingStartTime && (
          <span style={{ fontSize: "12px", opacity: 0.9 }}>
            Started: {recordingStartTime.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="video-component">
      {/* Recording indicator visible to all */}
      <RecordingIndicator />

      <div className="controls">
        <button onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
        <button onClick={toggleCamera}>{isCamOn ? "Cam Off" : "Cam On"}</button>
        <button onClick={shareScreen}>Share Screen</button>

        {/* Recording controls - only visible to hosts */}
        {role === "host" && (
          <>
            <button
              onClick={startRecording}
              disabled={isRecording}
              style={{
                background: isRecording ? "#86efac" : "#22c55e",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: isRecording ? "not-allowed" : "pointer",
              }}
            >
              {isRecording ? "Recording..." : "Start Recording"}
            </button>

            <button
              onClick={stopRecording}
              disabled={!isRecording}
              style={{
                background: !isRecording ? "#fca5a5" : "#ef4444",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: !isRecording ? "not-allowed" : "pointer",
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
