import React, { useEffect, useRef, useState } from 'react'

const ChatComponent = ({ socket, scheduleId, userId, username, role }) => {
  const [messages, setMessages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [raisedHands, setRaisedHands] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [handRaised, setHandRaised] = useState(false);
  const messagesEndRef = useRef(null);
  const handRaiseTimerRef = useRef(null); 

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-lower hand after 30 seconds
  const startHandRaiseTimer = () => {
    // Clear existing timer if any
    console.log("Starting hand raise timer");
    if (handRaiseTimerRef.current) {
      clearTimeout(handRaiseTimerRef.current);
    }

    // Set timer for 30 seconds
    handRaiseTimerRef.current = setTimeout(() => {
      if (handRaised) {
        console.log("Auto-lowering hand after 30 seconds");
        socket.emit("lowerHand", { scheduleId });
      }
    }, 30000); // 30 seconds
  };

  const clearHandRaiseTimer = () => {
    if (handRaiseTimerRef.current) {
      clearTimeout(handRaiseTimerRef.current);
      handRaiseTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!socket) return;

    // Chat message received
    socket.on("chatMessage", (msg) => {
     setMessages((prev) => [...prev, msg])
    });

    // Chat history (when joining)
    socket.on("chatHistory", (history) => {
     setMessages(history.messages || []);
       console.log("Chat history:", history);
    });

    // Poll events
    socket.on("roomEvent", (event) => {
      if (event.type === "pollCreated") {
        setPolls((prev) => [...prev, event]);
      } else if (event.type === "pollUpdate") {
        setPolls((prev) =>
          prev.map((poll) => (poll.id === event.id ? event : poll))
        );
      }
    });

    // Poll history
    socket.on("pollHistory", (history) => {
      setPolls(history);
    });

    // Hand raise events
    socket.on("handRaiseEvent", (event) => {
      if (event.type === "handRaised") {
        setRaisedHands((prev) => [
          ...prev.filter((h) => h.userId !== event.userId),
          event,
        ]);
      } else if (event.type === "handLowered") {
        setRaisedHands((prev) => prev.filter((h) => h.userId !== event.userId));
        if (event.userId === userId) {
          setHandRaised(false);
          clearHandRaiseTimer(); // Clear timer when hand is lowered
        }
      }
    });

    // Hand raise list
    socket.on("handRaiseList", (list) => {
      setRaisedHands(list);
    });

    // Error handling
    socket.on("error", (error) => {
      alert(`Error: ${error.message}`);
    });

    // Acknowledgments
    socket.on("messageAck", (ack) => {
      console.log("Message delivered:", ack);
    });

    socket.on("createPollAck", (ack) => {
      console.log("Poll created:", ack);
      setPollQuestion("");
      setPollOptions(["", ""]);
    });

    socket.on("voteAck", (ack) => {
      console.log("Vote recorded:", ack);
    });

    socket.on("handRaiseAck", (ack) => {
      console.log("Hand raised:", ack);
      setHandRaised(true);
      startHandRaiseTimer(); // Start 30-second timer
    });

    socket.on("handLowerAck", (ack) => {
      console.log("Hand lowered:", ack);
      setHandRaised(false);
      clearHandRaiseTimer(); // Clear timer
    });

    return () => {
      // Clear timer on component unmount
      clearHandRaiseTimer();
      
      socket.off("chatMessage");
      socket.off("chatHistory");
      socket.off("roomEvent");
      socket.off("pollHistory");
      socket.off("handRaiseEvent");
      socket.off("handRaiseList");
      socket.off("error");
      socket.off("messageAck");
      socket.off("createPollAck");
      socket.off("voteAck");
      socket.off("handRaiseAck");
      socket.off("handLowerAck");
    };
  }, [socket, userId, handRaised, scheduleId]);

  const sendMessage = () => {
    if (!messageText.trim()) return;
    socket.emit("chatMessage", { scheduleId, text: messageText });
    setMessageText("");
  };

  const createPoll = () => {
    if (
      !pollQuestion.trim() ||
      pollOptions.filter((opt) => opt.trim()).length < 2
    ) {
      alert("Please enter a question and at least 2 options");
      return;
    }
    socket.emit("createPoll", {
      scheduleId,
      question: pollQuestion,
      options: pollOptions.filter((opt) => opt.trim()),
    });
  };

  const votePoll = (pollId, optionIndex) => {
    socket.emit("votePoll", { pollId, optionIndex });
  };

  const raiseHand = () => {
    socket.emit("raiseHand", { scheduleId });
  };

  const lowerHand = () => {
    socket.emit("lowerHand", { scheduleId });
  };

  const addPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const updatePollOption = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  return (
    <div
      style={{
        width: "50%",
        height: "400px",
        border: "1px solid #ccc",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Chat & Interactions</h3>

      {/* Chat Messages */}
      <div
        style={{
          flex: 1,
          border: "1px solid #eee",
          borderRadius: "6px",
          padding: "8px",
          marginBottom: "8px",
          overflow: "auto",
          backgroundColor: "#fafafa",
        }}
      >
        <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}>Messages</h4>

        {messages?.map((msg, index) => (
          <div key={index} style={{ 
            marginBottom: "6px", 
            fontSize: "13px",
            padding: "4px 6px",
            backgroundColor: "white",
            borderRadius: "4px",
            border: "1px solid #f0f0f0"
          }}>
            <strong style={{ color: "#333" }}>{msg.senderName}:</strong> 
            <span style={{ marginLeft: "6px" }}>{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Improved UI */}
      <div style={{ 
        marginBottom: "10px",
        display: "flex",
        gap: "6px",
        alignItems: "center"
      }}>
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type your message..."
          style={{ 
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "20px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: "white"
          }}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        />
        <button 
          onClick={sendMessage}
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "18px",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: "500"
          }}
        >
          Send
        </button>
      </div>

      {/* Hand Raise */}
      <div style={{ marginBottom: "10px", fontSize: "14px" }}>
        <button
          onClick={handRaised ? lowerHand : raiseHand}
          style={{
            padding: "6px 12px",
            backgroundColor: handRaised ? "#dc3545" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: "pointer",
            marginRight: "8px"
          }}
        >
          {handRaised ? "Lower Hand" : "Raise Hand"}
        </button>
        {handRaised && (
          <span style={{ fontSize: "11px", color: "#666" }}>
            (Auto-lowers in 30s)
          </span>
        )}
        {raisedHands.length > 0 && (
          <span style={{ fontSize: "12px", color: "#666", marginLeft: "8px" }}>
            Raised: {raisedHands.map((h) => h.username).join(", ")}
          </span>
        )}
      </div>

      {/* Poll Creation (Host Only) */}
      {role === "host" && (
        <div
          style={{
            marginBottom: "10px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "8px",
            backgroundColor: "#f9f9f9"
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Create Poll</h4>
          <input
            type="text"
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Poll question..."
            style={{ 
              width: "100%", 
              marginBottom: "6px",
              padding: "6px 8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "13px"
            }}
          />
          {pollOptions.map((option, index) => (
            <div key={index} style={{ marginBottom: "4px", display: "flex", gap: "4px" }}>
              <input
                type="text"
                value={option}
                onChange={(e) => updatePollOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                style={{ 
                  flex: 1,
                  padding: "4px 6px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}
              />
              {pollOptions.length > 2 && (
                <button 
                  onClick={() => removePollOption(index)}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
            <button 
              onClick={addPollOption}
              style={{
                padding: "4px 8px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: "pointer"
              }}
            >
              Add Option
            </button>
            <button 
              onClick={createPoll}
              style={{
                padding: "4px 12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: "pointer"
              }}
            >
              Create Poll
            </button>
          </div>
        </div>
      )}

      {/* Active Polls */}
      <div style={{ overflow: "auto", flex: "0 0 auto", maxHeight: "120px" }}>
        <h4 style={{ margin: "0 0 6px 0", fontSize: "14px" }}>Polls</h4>
        {polls.map((poll) => (
          <div
            key={poll.id}
            style={{
              border: "1px solid #eee",
              borderRadius: "4px",
              padding: "6px",
              marginBottom: "6px",
              fontSize: "12px",
              backgroundColor: "white"
            }}
          >
            <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>
              {poll.question}
            </p>
            {poll.options.map((option, index) => (
              <div key={index} style={{ marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  onClick={() => votePoll(poll.id, index)}
              
                  style={{ 
                    padding: "2px 6px",
                    fontSize: "10px",
                    backgroundColor: poll.isActive ? "#007bff" : "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    cursor: poll.isActive ? "pointer" : "not-allowed"
                  }}
                >
                  Vote
                </button>
                <span>{option.text} ({option.votes} votes)</span>
              </div>
            ))}
            {!poll.isActive && (
              <p style={{ color: "#dc3545", fontSize: "10px", margin: "4px 0 0 0" }}>Poll Closed</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatComponent;
