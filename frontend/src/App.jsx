import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  FileText,
  Menu,
  Mic,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { apiRequest, uploadFile } from "./services/api";

const initialChats = [
  { id: 1, title: "Tell me about Abhishek", time: "Today" },
  { id: 2, title: "React & full-stack experience", time: "Yesterday" },
  { id: 3, title: "AWS project experience", time: "Yesterday" },
  { id: 4, title: "Resume overview", time: "Earlier" },
];

const suggestions = [
  "Tell me about Abhishek",
  "What are his strongest technical skills?",
  "Which projects are most relevant to a backend role?",
  "What experience does he have with AWS?",
];

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState(initialChats);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const createNewChat = () => {
    setActiveChat(null);
    setMessages([]);
    setInput("");
    setAttachedFile(null);
    setSidebarOpen(false);
  };

  const selectChat = (chat) => {
    setActiveChat(chat.id);
    setSidebarOpen(false);

    // Mock conversation until FastAPI is connected.
    // setMessages([
    //   {
    //     id: `${chat.id}-user`,
    //     role: "user",
    //     content: chat.title,
    //   },
    //   {
    //     id: `${chat.id}-assistant`,
    //     role: "assistant",
    //     content:
    //       "This is a mock response for the frontend. Once FastAPI is connected, this message will come from your Portfolio-AI backend and your personal knowledge base.",
    //   },
    // ]);
  };

  const sendMessage = async (text = input) => {
    const value = text.trim();
    if (!value && !attachedFile) return;

    let documentId = null;

    if(attachedFile) {
      const uploadData=await uploadFile(attachedFile);
      documentId=uploadData.document_id
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
      file: attachedFile?.name || null,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setAttachedFile(null);
    setIsLoading(true);

    if (!activeChat) {
      const newChat = {
        id: Date.now(),
        title: value || attachedFile?.name || "New conversation",
        time: "Just now",
      };

      setActiveChat(newChat.id);
      setChats((current) => [newChat, ...current]);
    }

    try {
      const data = await apiRequest("/chat", {
        method: "POST",
        body: JSON.stringify({
          message: value,
          document_id:documentId,
        }),
      });

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (error) {
      console.error("Chat API error:", error);

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (event) => {
    setInput(event.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowed.includes(file.type)) {
      alert("Please upload a PDF, DOCX, or TXT file.");
      event.target.value = "";
      return;
    }

    setAttachedFile(file);
    event.target.value = "";
  };

  const toggleVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <Sidebar
        chats={chats}
        activeChat={activeChat}
        open={sidebarOpen}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/80 px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 text-sm font-semibold">
            <div className="grid size-7 place-items-center rounded-lg bg-zinc-100 text-zinc-950">
              <Sparkles size={15} />
            </div>
            Portfolio-AI
          </div>

          <div className="size-9" />
        </header>

        <section className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 pb-36 pt-8 sm:px-6 lg:px-8">
            {messages.length === 0 ? (
              <Welcome onSuggestion={sendMessage} />
            ) : (
              <div className="space-y-8 py-6">
                {messages.map((message) => (
                  <Message key={message.id} message={message} />
                ))}

                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </section>

        <Composer
          input={input}
          attachedFile={attachedFile}
          isListening={isListening}
          isLoading={isLoading}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onSend={() => sendMessage()}
          onVoice={toggleVoice}
          onFile={handleFile}
          onRemoveFile={() => setAttachedFile(null)}
        />
      </main>
    </div>
  );
}

function Sidebar({ chats, activeChat, open, onNewChat, onSelectChat, onClose }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 lg:static lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-14 items-center justify-between px-3">
        <div className="flex items-center gap-2.5 px-2">
          <div className="grid size-8 place-items-center rounded-xl bg-zinc-100 text-zinc-950">
            <Sparkles size={16} />
          </div>
          <span className="font-semibold tracking-tight">Portfolio-AI</span>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-3 py-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm font-medium transition hover:border-zinc-700 hover:bg-zinc-800"
        >
          <Plus size={17} />
          New chat
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 px-2 pb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <span>Conversations</span>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-2">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left transition ${
              activeChat === chat.id
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <div className="truncate text-sm">{chat.title}</div>
            <div className="mt-1 text-[11px] text-zinc-600">{chat.time}</div>
          </button>
        ))}
      </div>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="grid size-8 place-items-center rounded-full bg-zinc-800">
            <User size={16} className="text-zinc-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Abhishek</p>
            <p className="truncate text-xs text-zinc-500">Portfolio-AI</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Welcome({ onSuggestion }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="mb-7 grid size-16 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/20">
        <Sparkles size={28} className="text-zinc-200" />
      </div>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Hi, I'm Abhishek's AI.
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500 sm:text-base">
        Ask me about his experience, projects, skills, or upload a job
        description to explore relevant experience.
      </p>

      <div className="mt-9 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {[
          { icon: User, text: "Tell me about Abhishek" },
          { icon: Sparkles, text: "What are his strongest skills?" },
          { icon: FileText, text: "Which projects fit this role?" },
          { icon: Search, text: "Ask about his AWS experience" },
        ].map(({ icon: Icon, text }) => (
          <button
            key={text}
            onClick={() => onSuggestion(text)}
            className="group flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-left text-sm text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <Icon size={17} className="shrink-0 text-zinc-600 transition group-hover:text-zinc-300" />
            <span>{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-950">
          <Bot size={17} />
        </div>
      )}

      <div
        className={`max-w-[85%] ${
          isUser
            ? "rounded-2xl rounded-br-md bg-zinc-800 px-4 py-3 text-sm leading-6 text-zinc-100"
            : "min-w-0 flex-1 pt-1 text-sm leading-7 text-zinc-300"
        }`}
      >
        <div className="message-content whitespace-pre-wrap">{message.content}</div>

        {message.file && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
            <FileText size={15} />
            <span className="truncate">{message.file}</span>
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-1 hidden size-8 shrink-0 place-items-center rounded-full bg-zinc-800 sm:grid">
          <User size={16} className="text-zinc-400" />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-950">
        <Bot size={17} />
      </div>
      <div className="flex items-center gap-1 pt-3">
        <span className="size-1.5 animate-pulse rounded-full bg-zinc-500" />
        <span className="size-1.5 animate-pulse rounded-full bg-zinc-500 [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-zinc-500 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function Composer({
  input,
  attachedFile,
  isListening,
  isLoading,
  textareaRef,
  fileInputRef,
  onInput,
  onKeyDown,
  onSend,
  onVoice,
  onFile,
  onRemoveFile,
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0">
      <div className="mx-auto max-w-4xl px-3 pb-3 sm:px-6 lg:px-8">
        <div className="pointer-events-auto rounded-2xl border border-zinc-800 bg-zinc-900/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {attachedFile && (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-zinc-800/70 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-300">
                <FileText size={15} />
                <span className="truncate">{attachedFile.name}</span>
              </div>
              <button
                onClick={onRemoveFile}
                className="rounded-md p-1 text-zinc-500 hover:text-zinc-200"
                aria-label="Remove file"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={onInput}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask anything about Abhishek..."
            className="max-h-[180px] min-h-12 w-full resize-none bg-transparent px-3 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600"
          />

          <div className="flex items-center justify-between px-1 pb-1">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={onFile}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Upload file"
              >
                <Paperclip size={18} />
              </button>

              <button
                onClick={onVoice}
                className={`rounded-lg p-2 transition ${
                  isListening
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
              >
                <Mic size={18} />
              </button>
            </div>

            <button
              onClick={onSend}
              disabled={isLoading || (!input.trim() && !attachedFile)}
              className="grid size-9 place-items-center rounded-xl bg-zinc-100 text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
              aria-label="Send message"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <p className="hidden pt-2 text-center text-[11px] text-zinc-700 sm:block">
          Portfolio-AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

export default App;