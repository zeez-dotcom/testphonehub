import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatWidgetProps {
  receiverId?: string;
  productId?: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export default function ChatWidget({ receiverId, productId }: ChatWidgetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const socketRef = useRef<Socket | null>(null);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chat/history", receiverId, productId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/chat/history/${receiverId}${productId ? `?productId=${productId}` : ""}`
      );
      return res.json();
    },
    enabled: !!receiverId && !!user,
  });

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("authToken");
    const socket = io("/", { auth: { token } });
    socketRef.current = socket;

    socket.on("message", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history", receiverId, productId] });
    });

    return () => {
      socket.disconnect();
    };
  }, [receiverId, user, queryClient, productId]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat", { receiverId, productId, content: text });
      return res.json();
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history", receiverId, productId] });
    },
  });

  if (!receiverId) return null;

  return (
    <div className="border rounded p-4 space-y-2">
      <div className="h-64 overflow-y-auto space-y-1">
        {messages.map((m) => (
          <div key={m.id} className={`text-sm ${m.senderId === user?.id ? "text-right" : "text-left"}`}>
            <span className="inline-block px-2 py-1 rounded bg-gray-200">{m.content}</span>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          sendMutation.mutate();
        }}
        className="flex gap-2"
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" />
        <Button type="submit" disabled={sendMutation.isPending}>Send</Button>
      </form>
    </div>
  );
}
