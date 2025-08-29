import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { io } from "socket.io-client";
import VideoComponent from "./components/VideoComponent";
import ChatComponent from "./components/ChatComponent";

function App() {
  class SocketManager {
    constructor() {
      this.socket = null;
      this.isConnected = false;
    }

    connect() {
      this.socket = io("http://localhost:3000/video-calling");

      this.socket.on("connect", () => {
        this.isConnected = true;
        console.log("Connected to server");
      });

      this.socket.on("disconnect", () => {
        this.isConnected = false;
        console.log("Disconnected from server");
      });

      return this.socket;
    }

    disconnect() {
      if (this.socket) {
        this.socket.disconnect();
      }
    }
  }

  const [socket, setSocket] = useState(null);
  const [joined, setJoined] = useState(false);
  const [scheduleId, setScheduleId] = useState("");
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("participant");

  const socketManager = new SocketManager();

  useEffect(() => {
    const newSocket = socketManager.connect();
    setSocket(newSocket);

    newSocket.on("livekit-auth", (auth) => {
      console.log("LiveKit Auth received:", auth);
      // Here you would initialize LiveKit with the token
    });

    newSocket.on("roomClosed", (data) => {
      alert(data.message);
      setJoined(false);
    });

    return () => {
      socketManager.disconnect();
    };
  }, []);

  const joinRoom = () => {
    if (!scheduleId || !userId || !username) {
      alert("Please fill all fields");
      return;
    }

    const userData = {
      scheduleId,
      userId,
      username,
      role,
      platformId: "P101",
    };

    socket.emit("joinRoom", userData);
    setJoined(true);
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom", {platformId:"P101",username, scheduleId, userId,role });
    setJoined(false);
  };

  const endRoom = () => {
    if (role === "host") {
      socket.emit("endRoom", {platformId:"P101",username, scheduleId, userId,role });
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
          userId={userId}
          username={username}
          role={role}
        />
        <ChatComponent
          socket={socket}
          scheduleId={scheduleId}
          userId={userId}
          username={username}
          role={role}
        />
      </div>
    </div>
  );
}

export default App;
