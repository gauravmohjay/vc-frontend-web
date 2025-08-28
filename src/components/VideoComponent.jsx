// VideoComponent.jsx
import { useEffect, useState, useRef } from "react";
import * as LivekitClient from "livekit-client";

const VideoComponent = ({ socket }) => {
  const [room, setRoom] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [participants, setParticipants] = useState(new Map());
  const videosRef = useRef(null);

  useEffect(() => {
    if (!socket) {
      console.error("Socket not available");
      return;
    }

    const handleLivekitAuth = async ({ url, token }) => {
      try {
        const newRoom = new LivekitClient.Room({
          autoSubscribe: true,
        });

        newRoom
          .on("participantConnected", (participant) => {
            console.log("Participant connected:", participant.identity);
            addPlaceholder(participant.identity);
          })
          .on("participantDisconnected", (participant) => {
            removeTile(participant.identity);
          })
          .on("trackSubscribed", (track, publication, participant) => {
            attachTrack(track, participant.identity);
          })
          .on("trackUnsubscribed", (track, publication, participant) => {
            detachTrack(track, participant.identity);
          });

        await newRoom.connect(url, token);
        setRoom(newRoom);
        console.log("new room",newRoom);

        // Show self tile
        addPlaceholder(newRoom.localParticipant.identity);

        // Add already existing participants
        for (const [id, participant] of newRoom.remoteParticipants) {
          console.log("Existing participant:", participant.identity);
          addPlaceholder(participant.identity);

          participant.tracks.forEach((pub) => {
            if (pub.isSubscribed && pub.track) {
              attachTrack(pub.track, participant.identity);
            }
          });
        }
      } catch (error) {
        console.error("Error connecting to LiveKit:", error);
      }
    };

    socket.on("livekit-auth", handleLivekitAuth);

    return () => {
      socket.off("livekit-auth", handleLivekitAuth);
      if (room) {
        room.disconnect();
      }
    };
  }, []);

  const addPlaceholder = (identity) => {
    setParticipants((prev) => {
      if (!prev.has(identity)) {
        const newParticipants = new Map(prev);
        newParticipants.set(identity, {
          identity,
          hasVideo: false,
          videoElement: null,
          audioElement: null,
        });
        return newParticipants;
      }
      return prev;
    });
  };

  const attachTrack = async (track, identity) => {
    console.log("Attaching track:", track.kind, "for", identity);

    const element = track.attach();
    element.id = `media-${identity}-${track.kind}`;
    element.autoplay = true;
    element.playsInline = true;

    if (track.kind === "video") {
      setParticipants((prev) => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(identity) || { identity };
        participant.hasVideo = true;
        participant.videoElement = element;
        newParticipants.set(identity, participant);
        return newParticipants;
      });
    } else if (track.kind === "audio") {
      element.muted = identity === room?.localParticipant?.identity;
      try {
        await element.play();
      } catch (err) {
        console.warn("Autoplay blocked, waiting for gesture", err);
      }

      setParticipants((prev) => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(identity) || { identity };
        participant.audioElement = element;
        newParticipants.set(identity, participant);
        return newParticipants;
      });

      // Append audio to body
      document.body.appendChild(element);
    }
  };

  const detachTrack = (track, identity) => {
    const element = document.getElementById(`media-${identity}-${track.kind}`);
    if (element) {
      track.detach(element);
      element.remove();
    }

    if (track.kind === "video") {
      setParticipants((prev) => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(identity);
        if (participant) {
          participant.hasVideo = false;
          participant.videoElement = null;
          newParticipants.set(identity, participant);
        }
        return newParticipants;
      });
    }
  };

  const removeTile = (identity) => {
    setParticipants((prev) => {
      const newParticipants = new Map(prev);
      newParticipants.delete(identity);
      return newParticipants;
    });
  };

  const toggleMute = async () => {
    if (!room) return;

    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (!room.localParticipant.microphoneTrack) {
      const [micTrack] = await LivekitClient.createLocalTracks({ audio: true });
      await room.localParticipant.publishTrack(micTrack);
    }
    room.localParticipant.setMicrophoneEnabled(!newMutedState);
  };

  const toggleCamera = async () => {
    if (!room) return;

    const newCamState = !isCamOn;
    setIsCamOn(newCamState);

    if (!room.localParticipant.cameraTrack && newCamState) {
      const [camTrack] = await LivekitClient.createLocalTracks({ video: true });
      await room.localParticipant.publishTrack(camTrack);
      attachTrack(camTrack, room.localParticipant.identity);
    } else {
      room.localParticipant.setCameraEnabled(newCamState);
    }
  };

  const shareScreen = async () => {
    if (!room) return;

    try {
      await room.localParticipant.setScreenShareEnabled(true);
      const tracks = await LivekitClient.createLocalTracks({ screen: true });
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
        attachTrack(track, `${room.localParticipant.identity}-screen`);
      }
    } catch (error) {
      console.error("Error sharing screen:", error);
    }
  };

  const ParticipantTile = ({ participant }) => {
    const tileRef = useRef(null);

    useEffect(() => {
      if (participant.videoElement && tileRef.current) {
        // Clear the tile first
        tileRef.current.innerHTML = "";
        if (participant.hasVideo && participant.videoElement) {
          tileRef.current.appendChild(participant.videoElement);
        } else {
          // Show placeholder
          const placeholder = document.createElement("div");
          placeholder.className = "placeholder";
          placeholder.innerText = participant.identity.toUpperCase();
          tileRef.current.appendChild(placeholder);
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
      <div className="controls">
        <button onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
        <button onClick={toggleCamera}>{isCamOn ? "Cam Off" : "Cam On"}</button>
        <button onClick={shareScreen}>Share Screen</button>
      </div>

      <div id="videos" className="videos" ref={videosRef}>
        {Array.from(participants.values()).map((participant) => (
          <ParticipantTile
            key={participant.identity}
            participant={participant}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoComponent;
