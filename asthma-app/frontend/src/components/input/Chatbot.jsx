import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import ToggleButton from "./ToggleButton";
import ArrowButton from "./ArrowButton";
import { Rnd } from "react-rnd";
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

    const EXPANDED_DEFAULT = {
        width: 400,
        height: 500,
    };

    const [size, setSize] = useState(EXPANDED_DEFAULT);
    const previousExpandedSize = useRef(EXPANDED_DEFAULT);

    const [position, setPosition] = useState(() => ({
        x: window.innerWidth - EXPANDED_DEFAULT.width - 20,
        y: window.innerHeight - EXPANDED_DEFAULT.height - 20,
    }));

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    const containerRef = useRef(null);

    useLayoutEffect(() => {
        if (isCollapsed && containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();

            setSize((prev) => ({
                width: Math.ceil(width),
                height: Math.ceil(height),
            }));
        } else {
            setSize(previousExpandedSize.current);
        }
    }, [isCollapsed, title]);

    function onCollapse() {
        toggleCollapsed((c) => !c);
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
            ref={containerRef}
            className={`contact-card d-flex flex-column ${
                isFloating ? "chatbot-floating" : "position-relative"
            }`}
            style={{
                width: isCollapsed ? "auto" : "100%",
                height: isCollapsed ? "auto" : isFloating ? "100%" : 600,
                resize: "none",
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
        <Rnd
            size={size}
            position={position}
            onDragStop={(e, d) => {
                setPosition({
                    x: d.x,
                    y: d.y,
                });
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
                const newSize = {
                    width: ref.offsetWidth,
                    height: ref.offsetHeight,
                };

                setSize(newSize);
                previousExpandedSize.current = newSize;
                setPosition(position);
            }}
            enableResizing={
                isCollapsed
                    ? {
                        left: true,
                        right: true,
                        top: false,
                        bottom: false,
                        topLeft: false,
                        topRight: false,
                        bottomLeft: false,
                        bottomRight: false,
                    }
                    : true
            }
            minWidth={300}
            minHeight={isCollapsed ? 0 : 300}
            bounds="window"
            style={{
                position: "fixed",
                zIndex: 9999,
            }}
        >
            {chatbot}
        </Rnd>
    );
}

export default Chatbot;
