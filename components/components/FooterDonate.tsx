import React from "react";
import DonateButton from "./DonateButton";
export default function FooterDonate({ hidden }: { hidden?: boolean }) {
  return <DonateButton hidden={hidden} />;
}
