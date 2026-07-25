"use client";

import { MessageThread } from "@/components/member/message-thread";

export default function MessagesPage() {
  return (
    <div className="space-y-4">
      <MessageThread role="member" coachName="Coach Helna" />
    </div>
  );
}
