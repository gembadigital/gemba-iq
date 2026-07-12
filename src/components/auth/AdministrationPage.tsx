import React from "react";
import { useNavigate } from "react-router-dom";
import AdministrationCenter from "../AdministrationCenter";

export default function AdministrationPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090b]">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8">
        <AdministrationCenter onClose={() => navigate("/")} initialSubTab="organization" />
      </div>
    </div>
  );
}
