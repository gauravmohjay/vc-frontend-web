// VideoComponent.jsx
import { useEffect, useState, useRef } from "react";
import * as LivekitClient from "livekit-client";

const VideoComponent = ({ socket, scheduleId, role, userId, username }) => {
  const [room, setRoom] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isCamOn, setIsCamOn] = useState(false);
  const [participants, setParticipants] = useState(new Map());
  const [isRoomRecording, setIsRoomRecording] = useState(false);

  // Simple screen recording states
  const [isScreenRecording, setIsScreenRecording] = useState(false);
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

    // Simple screen recording handlers
    const handleScreenRecordingStarted = (result) => {
      setIsScreenRecording(true);
      console.log("🖥️ Screen recording started:", result);
      alert(`Screen recording started: ${result.filename}`);
    };

    const handleScreenRecordingStopped = (result) => {
      setIsScreenRecording(false);
      console.log("🖥️ Screen recording stopped:", result);
      alert(`Screen recording saved as: ${result.filename}`);
    };

    const handleRecordingError = (error) => {
      console.error("❌ Recording error:", error);
      alert(`Recording error: ${error.message}`);
      setIsScreenRecording(false);
    };
    const handleRoomRecordingStarted = (result) => {
      setIsRoomRecording(true);
      console.log("🏠 Room recording started:", result);
      alert(`Room recording started: ${result.filename}`);
    };

    const handleRoomRecordingStopped = (result) => {
      setIsRoomRecording(false);
      console.log("🏠 Room recording stopped:", result);
      alert(`Room recording saved as: ${result.filename}`);
    };

    // Socket event listeners
    socket.on("livekit-auth", handleLivekitAuth);
    socket.on("screenRecordingStarted", handleScreenRecordingStarted);
    socket.on("screenRecordingStopped", handleScreenRecordingStopped);
    socket.on("recordingError", handleRecordingError);
    socket.on("roomRecordingStarted", handleRoomRecordingStarted);
    socket.on("roomRecordingStopped", handleRoomRecordingStopped);

    return () => {
      socket.off("livekit-auth", handleLivekitAuth);
      socket.off("screenRecordingStarted", handleScreenRecordingStarted);
      socket.off("screenRecordingStopped", handleScreenRecordingStopped);
      socket.off("roomRecordingStarted", handleRoomRecordingStarted);
      socket.off("roomRecordingStopped", handleRoomRecordingStopped);
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

  // Media Controls
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

  // Simple Screen Recording Controls
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
  // Room Recording Controls
  const startRoomRecording = () => {
    if (role !== "host" || !socket) return;

    socket.emit("startRoomRecording", {
      scheduleId,
      userId,
      username,
      role,
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

  return (
    <div className="video-component">
      {(isScreenRecording || isRoomRecording) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: isRoomRecording ? "#059669" : "#9333ea",
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
          <span>
            {isRoomRecording ? "Room Recording" : "Screen Recording"} in
            progress...
          </span>
        </div>
      )}

      <div className="controls">
        <button onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
        <button onClick={toggleCamera}>{isCamOn ? "Cam Off" : "Cam On"}</button>
        <button onClick={shareScreen}>
          {isScreenSharing ? "Stop Screen Share" : "Share Screen"}
        </button>

        {/* Simple Screen Recording Control - only for hosts */}
        {role === "host" && (
          <button
            onClick={
              isScreenRecording ? stopScreenRecording : startScreenRecording
            }
            disabled={!isScreenSharing}
            style={{
              background: isScreenRecording ? "#ef4444" : "#9333ea",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: !isScreenSharing ? "not-allowed" : "pointer",
            }}
          >
            {isScreenRecording ? "Stop Recording" : "Record Screen"}
          </button>
        )}
        {role === "host" && (
          <button
            onClick={isRoomRecording ? stopRoomRecording : startRoomRecording}
            style={{
              background: isRoomRecording ? "#ef4444" : "#059669",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              marginLeft: "8px",
            }}
          >
            {isRoomRecording ? "Stop Room Recording" : "Record Room"}
          </button>
        )}
      </div>

      <div id="videos" className="videos" ref={videosRef}>
        {Array.from(participants.values()).map((p) => (
          <ParticipantTile key={p.identity} participant={p} />
        ))}
      </div>

      {/* CSS for blinking animation */}
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
