"use client";

import { BackgroundSettingsForm } from "./background-settings-form";

export function BackgroundSettingsContent() {
  return <BackgroundSettingsForm endpoint="/api/user/settings" scope="personal" />;
}
