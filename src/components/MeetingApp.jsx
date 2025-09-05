import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import VideoComponent from "./VideoComponent";
import ChatComponent from "./ChatComponent";

function MeetingApp() {
  const [socket, setSocket] = useState(null);
  const [joined, setJoined] = useState(false);
  const [scheduleId, setScheduleId] = useState("");
  const [occurrenceId, setOccurrenceId] = useState("");
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("participant");

  useEffect(() => {
    // connect to your custom namespace
    const newSocket = io("http://localhost:3000/video-calling");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setJoined(false);
    });

    // livekit token received after successful join + auth
    newSocket.on("livekit-auth", (auth) => {
      console.log("LiveKit Auth received:", auth);
      // Initialize LiveKit here when needed
    });

    // consider join complete when server hydrates chat history
    newSocket.on("chatHistory", () => {
      setJoined(true);
    });

    // server may deny joining (waiting room / not found / closed)
    newSocket.on("joinDenied", (payload) => {
      alert(`${payload.reason || "Join denied"}`);
      setJoined(false);
    });

    // host closed room
    newSocket.on("roomClosed", (data) => {
      alert(data.message);
      setJoined(false);
    });

    // generic server errors
    newSocket.on("error", (error) => {
      alert(`Error: ${error.message}`);
    });

    return () => {
      // cleanup listeners and disconnect the socket
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("livekit-auth");
      newSocket.off("chatHistory");
      newSocket.off("joinDenied");
      newSocket.off("roomClosed");
      newSocket.off("error");
      newSocket.disconnect();
    };
  }, []);

  const joinRoom = () => {
    if (!scheduleId  || !userId || !username) {
      alert("Please fill all fields");
      return;
    }

    const userData = {
      scheduleId,
      occurrenceId,
      userId,
      username,
      role, // server will compute effective role; this is just for UI
      platformId: "miskills2",
    };

    socket.emit("joinRoom", userData);
    // joined state will be set upon receiving "chatHistory"
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom", {
      platformId: "P101",
      username,
      scheduleId,
      userId,
      role,
      occurrenceId, // optional for server leave handler; included for consistency
    });
    setJoined(false);
  };

  const endRoom = () => {
    if (role === "host") {
      socket.emit("endRoom", {
        platformId: "P101",
        username,
        scheduleId,
        userId,
        role,
        occurrenceId, // optional here; server closes by scheduleId
      });
    }
  };

  if (!joined) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Meeting App - Test Interface</h1>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            placeholder="Room ID (scheduleId)"
            style={{ marginRight: "10px", width: "200px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={occurrenceId}
            onChange={(e) => setOccurrenceId(e.target.value)}
            placeholder="Occurrence ID"
            style={{ marginRight: "10px", width: "200px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            style={{ marginRight: "10px", width: "200px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            style={{ marginRight: "10px", width: "200px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="participant">Participant</option>
            <option value="host">Host</option>
          </select>
        </div>
        <button onClick={joinRoom}>Join Room</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Meeting: {scheduleId}</h1>
        <div>
          <span style={{ marginRight: "10px" }}>
            Welcome, {username} ({role})
          </span>
          <button onClick={leaveRoom} style={{ marginRight: "10px" }}>
            Leave Room
          </button>
          {role === "host" && (
            <button
              onClick={endRoom}
              style={{ backgroundColor: "red", color: "white" }}
            >
              End Meeting
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        <VideoComponent
          socket={socket}
          scheduleId={scheduleId}
          occurrenceId={occurrenceId}
          userId={userId}
          username={username}
          role={role}
        />
        <ChatComponent
          socket={socket}
          scheduleId={scheduleId}
          occurrenceId={occurrenceId}
          userId={userId}
          username={username}
          role={role}
        />
      </div>
    </div>
  );
}

export default MeetingApp;
