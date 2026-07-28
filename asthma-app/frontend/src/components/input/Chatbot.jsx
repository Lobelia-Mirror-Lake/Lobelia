import { useState, useRef, useEffect } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import ToggleButton from "./ToggleButton";
import ArrowButton from "./ArrowButton";

function Chatbot({
    title,
    isFloating,
}) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: "ai",
            text: "Hello! How can I help you today?",
        },
    ]);

    const [input, setInput] = useState("");
    const [isCollapsed, toggleCollapsed] = useState(isFloating);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    function onCollapse() {
        toggleCollapsed((curr) => !curr);
    }

    async function sendMessage() {
        if (!input.trim()) return;

        const userMessage = {
            id: Date.now(),
            sender: "user",
            text: input,
        };

        setMessages((prev) => [...prev, userMessage]);

        const prompt = input;
        setInput("");

        // Replace this with your AI request.
        // Example:
        //
        // const response = await fetch(...);
        // const data = await response.json();
        // const reply = data.message;

        const reply = "This is a placeholder AI response.";

        setMessages((prev) => [
            ...prev,
            {
                id: Date.now() + 1,
                sender: "ai",
                text: reply,
            },
        ]);
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    return (
        <Container
            className={`contact-card d-flex flex-column ${
                isFloating ? "chatbot-floating" : "position-relative"
            }`}
            style={{
                height: isCollapsed ? "auto" : (isFloating ? 500 : 600)
            }}
        >
            <Row className="vertical">
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

                {!isCollapsed &&
                    <Col>
                        <hr />
                    </Col>
                }
            </Row>
            
            {!isCollapsed && ( <>
                <div className="chatbot-conversation">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`chatbot-row ${message.sender}`}
                        >
                            <div
                                className={`chatbot-bubble ${message.sender}`}
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
                            placeholder="Type a message..."
                            value={input}
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
            </>)}
        </Container>
    );
}

export default Chatbot;