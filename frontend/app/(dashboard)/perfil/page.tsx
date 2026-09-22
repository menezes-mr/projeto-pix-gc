import React from "react";
import { ProfileHeader } from "@/components/profile/profile-header";
import { PersonalDataForm } from "@/components/profile/personal-data-form";
import { LimitsCard } from "@/components/profile/limits-card";
import { SecuritySettings } from "@/components/profile/security-settings";
import { DangerZone } from "@/components/profile/danger-zone";

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
      
      <ProfileHeader />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="flex flex-col gap-6">
          <PersonalDataForm />
          <LimitsCard />
        </div>

        <div className="flex flex-col gap-6">
          <SecuritySettings />
          <DangerZone />
        </div>

      </div>
    </div>
  );
}
