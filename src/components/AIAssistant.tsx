"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Bot } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    text: string;
}

export function AIAssistant() {
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    const [messages, setMessages] = useState<Message[]>([
        { id: "init", role: "assistant", text: "System Online. I am DocuMind's architectural interface. How can I help you understand this codebase?" }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", text: inputValue };
        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                body: JSON.stringify({ message: userMsg.text, context: "Repository scan active." }), // Basic context for now
            });
            const data = await res.json();

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                text: data.response || "Communication error."
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (e) {
            setMessages(prev => [...prev, { id: "err", role: "assistant", text: "Error connecting to AI Core." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-8 left-8 z-50 flex flex-col items-start gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="w-[350px] h-[450px] bg-background-secondary/95 backdrop-blur-xl border border-accent-primary/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-3">
                                <Bot className="w-5 h-5 text-accent-primary" />
                                <span className="text-xs font-bold uppercase tracking-widest text-text-primary">AI Core</span>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`
                                        max-w-[85%] p-3 rounded-lg text-xs leading-relaxed
                                        ${msg.role === "user"
                                            ? "bg-accent-primary text-background-primary font-medium rounded-tr-none"
                                            : "bg-white/10 text-text-primary border border-white/5 rounded-tl-none"}
                                    `}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white/10 p-3 rounded-lg rounded-tl-none flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce" />
                                        <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce delay-75" />
                                        <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce delay-150" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-white/10 bg-white/5">
                            <div className="flex gap-2">
                                <input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                    placeholder="Ask about architecture..."
                                    className="flex-1 bg-background-primary/50 border border-white/10 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary/50 transition-colors"
                                />
                                <button
                                    onClick={handleSend}
                                    className="p-2 bg-accent-primary text-background-primary rounded-md hover:brightness-110 transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Bubble */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.3)] border border-accent-primary/20 bg-background-primary group overflow-hidden"
            >
                {/* Animated gradient background */}
                <motion.div
                    className="absolute inset-0 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{
                        background: "radial-gradient(circle at 30% 30%, rgba(0, 242, 255, 0.4), rgba(0, 242, 255, 0.1), transparent)",
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />

                {/* Secondary pulse layer */}
                <motion.div
                    className="absolute inset-2 rounded-full"
                    style={{
                        background: "radial-gradient(circle at 70% 70%, rgba(0, 242, 255, 0.3), transparent)",
                    }}
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 rounded-full opacity-20" style={{
                    backgroundImage: `
                        linear-gradient(0deg, transparent 24%, rgba(0, 242, 255, 0.3) 25%, rgba(0, 242, 255, 0.3) 26%, transparent 27%, transparent 74%, rgba(0, 242, 255, 0.3) 75%, rgba(0, 242, 255, 0.3) 76%, transparent 77%, transparent),
                        linear-gradient(90deg, transparent 24%, rgba(0, 242, 255, 0.3) 25%, rgba(0, 242, 255, 0.3) 26%, transparent 27%, transparent 74%, rgba(0, 242, 255, 0.3) 75%, rgba(0, 242, 255, 0.3) 76%, transparent 77%, transparent)
                    `,
                    backgroundSize: "8px 8px",
                }} />

                <div className="relative z-10 text-accent-primary drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]">
                    {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </div>
            </motion.button>
        </div>
    );
}
