import React, { useEffect, useState } from "react";
import { Modal } from "react-native";
import { shouldPromptToday, markPromptedToday } from "@lib/checkin";
import CheckInModal from "../modals/CheckInModal";
export default function CheckInGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await shouldPromptToday();
      if (mounted && ok) {
        setOpen(true);
        await markPromptedToday();
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <>
      {children}
      <Modal visible={open} animationType="slide" transparent>
        <CheckInModal onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}
