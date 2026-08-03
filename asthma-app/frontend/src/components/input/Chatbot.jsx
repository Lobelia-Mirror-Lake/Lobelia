import { useState, useRef, useEffect } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import ToggleButton from "./ToggleButton";
import ArrowButton from "./ArrowButton";
import Draggable from "react-draggable";
import { useAuth } from "../../context/AuthContext";
import { askCopilot, formatCopilotReply } from "../../helper-functions/askCopilot";

function Chatbot({
    title,
    isFloating,
    beginClosed = false,
}) {
    const { token } = useAuth();
    const nodeRef = useRef(null);
    const [offsetY] = useState(0);

    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: "ai",
            text: "Hello! Ask about today's risk, pollen, or plans. For symptoms and inhaler use, log a check-in so they count toward your prediction.",
        },
    ]);

    const [input, setInput] = useState("");
    const [isCollapsed, toggleCollapsed] = useState(beginClosed);
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    async function onCollapse() {
        toggleCollapsed((curr) => !curr);
    }

    async function sendMessage() {
        const trimmed = input.trim();
        if (!trimmed || isSending) return;

        if (!token) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    sender: "ai",
                    text: "Please log in to chat with Copilot.",
                },
            ]);
            return;
        }

        const userMessage = {
            id: Date.now(),
            sender: "user",
            text: trimmed,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsSending(true);

        try {
            const data = await askCopilot({ token, message: trimmed });
            const reply = formatCopilotReply(data.advice);
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    sender: "ai",
                    text: reply,
                },
            ]);
        } catch (error) {
            let text = error.message || "Unable to reach Copilot right now.";
            if (error.code === "FORECAST_NOT_FOUND" || error.status === 404) {
                text =
                    "No prediction is available yet. Complete today's check-in and generate a forecast on Home or Statistics first.";
            }
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    sender: "ai",
                    text,
                },
            ]);
        } finally {
            setIsSending(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    const chatbot = (
        <Container
            className={`contact-card d-flex flex-column chatbot-header ${
                isFloating ? "chatbot-floating" : "position-relative"
            }`}
            style={{
                height: isCollapsed ? "auto" : isFloating ? 500 : 600,
            }}
        >
            <Row
                className="vertical chatbot-header"
                style={{
                    cursor: isFloating ? "move" : "default",
                    userSelect: "none",
                }}
            >
                <Col className="position-relative">
                    <h2
                        className="text-center"
                        style={{
                            overflowWrap: "break-word",
                        }}
                    >
                        {title}
                    </h2>

                    {isFloating && (
                        <div className="chatbot-collapse">
                            <ToggleButton
                                className="button-light p-2"
                                width="25"
                                height="25"
                                isCollapse={isCollapsed}
                                onClick={onCollapse}
                            />
                        </div>
                    )}
                </Col>

                {!isCollapsed && (
                    <Col>
                        <hr />
                    </Col>
                )}
            </Row>

            {!isCollapsed && (
                <>
                    <p className="chatbot-hint px-2 small text-muted mb-1">
                        Tips about activities and environment are fine here. Log
                        symptoms or rescue puffs in your check-in so they update
                        your risk prediction.
                    </p>
                    <div className="chatbot-conversation">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`chatbot-row ${message.sender}`}
                            >
                                <div
                                    className={`chatbot-bubble ${message.sender}`}
                                    style={{ whiteSpace: "pre-wrap" }}
                                >
                                    {message.text}
                                </div>
                            </div>
                        ))}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chatbot-input">
                        <div className="chatbot-input-field form-full light">
                            <Form.Control
                                className="light"
                                as="textarea"
                                rows={2}
                                placeholder={
                                    isSending
                                        ? "Copilot is thinking..."
                                        : "Type a message..."
                                }
                                value={input}
                                disabled={isSending}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>

                        <ArrowButton
                            className="button-light p-2"
                            isSend
                            onClick={sendMessage}
                        />
                    </div>
                </>
            )}
        </Container>
    );

    if (!isFloating) {
        return chatbot;
    }

    return (
        <Draggable nodeRef={nodeRef} handle=".chatbot-header">
            <div
                ref={nodeRef}
                style={{
                    position: "fixed",
                    right: "20px",
                    bottom: "20px",
                    zIndex: 9999,
                    transform: `translateY(${offsetY}px)`,
                }}
            >
                {chatbot}
            </div>
        </Draggable>
    );
}

export default Chatbot;
