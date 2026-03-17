"use client";

import { BackgroundSettingsForm } from "./background-settings-form";

export function GlobalBackgroundSettingsContent() {
  return <BackgroundSettingsForm endpoint="/api/config/background" scope="global" />;
}
