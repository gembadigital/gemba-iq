import React from "react";
const logoImage = "https://lh3.googleusercontent.com/d/13bNnthJU4LIICB4iiF1a4GH1PEn05MBx";

interface GembaLogoProps {
  className?: string;
  collapsed?: boolean;
}

export default function GembaLogo({ className = "", collapsed = false }: GembaLogoProps) {
  const sharingLink = "https://drive.google.com/file/d/1RsaHnpwhk4IjOcaNixAbqGG2x5uuei33/view?usp=sharing";

  return (
    <div 
      className={`select-none flex items-center justify-center w-full ${className}`} 
      id="gemba-sidebar-branding-block"
    >
      <a href={sharingLink} target="_blank" rel="noreferrer" className="inline-block hover:opacity-90 transition-opacity">
        <img
          src={logoImage}
          style={{
            height: collapsed ? "22px" : "38px",
            width: "auto",
            objectFit: "contain",
            verticalAlign: "middle",
            marginRight: collapsed ? "0px" : "8px",
            borderRadius: "4px"
          }}
          alt="Gemba Partner Logo"
          referrerPolicy="no-referrer"
        />
      </a>
    </div>
  );
}
