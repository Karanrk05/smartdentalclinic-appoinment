import React from 'react';

interface SmartDentalLogoProps {
  className?: string;
  size?: number | string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  subtextClassName?: string;
  wordmarkText?: React.ReactNode;
  subtextText?: React.ReactNode;
  containerClassName?: string;
}

export const SmartDentalLogo: React.FC<SmartDentalLogoProps> = ({
  className = 'w-10 h-10',
  size,
  showWordmark = false,
  wordmarkClassName = 'text-[#1e40af] font-black text-lg sm:text-xl tracking-tight leading-tight',
  subtextClassName = 'text-[10px] font-bold text-[#64748b] tracking-wider uppercase',
  wordmarkText = 'Smart Dental Clinic',
  subtextText = 'Smile With Us',
  containerClassName,
}) => {
  const sizeStyle = size ? { width: size, height: size } : undefined;

  return (
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 min-w-0 select-none ${containerClassName || 'shrink-0'}`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 drop-shadow-xs ${className}`}
        style={sizeStyle}
        aria-label="Smart Dental Clinic Logo - Smile With Us"
        role="img"
      >
        <defs>
          {/* Top text arc */}
          <path
            id="smart-dental-top-curve"
            d="M 28 100 A 72 72 0 0 1 172 100"
            fill="none"
          />
          {/* Bottom text arc */}
          <path
            id="smart-dental-bottom-curve"
            d="M 166 100 A 66 66 0 0 1 34 100"
            fill="none"
          />
          {/* Gradients matching the uploaded logo */}
          <linearGradient id="blueRingGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00b4d8" />
            <stop offset="50%" stopColor="#0096c7" />
            <stop offset="100%" stopColor="#0077b6" />
          </linearGradient>

          <linearGradient id="toothBlueGrad" x1="60" y1="60" x2="140" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0096c7" />
            <stop offset="100%" stopColor="#023e8a" />
          </linearGradient>

          <linearGradient id="toothCyanGreenGrad" x1="50" y1="100" x2="140" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00d2b4" />
            <stop offset="100%" stopColor="#00b894" />
          </linearGradient>
        </defs>

        {/* 1. Outer Blue Ring */}
        <circle cx="100" cy="100" r="95" fill="url(#blueRingGrad)" />

        {/* 2. Top Arc Text: SMART DENTAL CLINIC */}
        <text
          fill="#ffffff"
          fontSize="14.5"
          fontWeight="900"
          letterSpacing="2.8px"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        >
          <textPath href="#smart-dental-top-curve" startOffset="50%" textAnchor="middle">
            SMART DENTAL CLINIC
          </textPath>
        </text>

        {/* 3. Bottom Arc Text: SMILE WITH US */}
        <text
          fill="#ffffff"
          fontSize="14"
          fontWeight="900"
          letterSpacing="3.2px"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        >
          <textPath href="#smart-dental-bottom-curve" startOffset="50%" textAnchor="middle">
            SMILE WITH US
          </textPath>
        </text>

        {/* 4. White Inner Circular Badge */}
        <circle cx="100" cy="100" r="62" fill="#ffffff" />

        {/* 5. Center Stylized Tooth Artwork (Exact match to uploaded logo) */}
        <g id="center-tooth-graphic">
          {/* Top Blue Crown Section with Swoop */}
          <path
            d="M 68 76 
               C 74 70, 85 70, 92 75 
               C 97 78, 103 78, 108 75 
               C 115 70, 126 70, 132 76 
               C 138 82, 142 90, 137 101 
               C 131 113, 115 120, 96 123 
               C 80 125, 68 119, 64 109 
               C 59 96, 62 82, 68 76 Z"
            fill="url(#toothBlueGrad)"
          />

          {/* Dynamic White Tooth Accent Curve (creates the layered swoosh in the center) */}
          <path
            d="M 72 82 
               C 82 76, 92 82, 100 87 
               C 110 93, 124 94, 135 88 
               C 132 94, 126 100, 118 103 
               C 104 107, 90 105, 78 98 
               C 74 94, 72 88, 72 82 Z"
            fill="#ffffff"
            opacity="0.3"
          />

          {/* Lower Green/Cyan Dynamic Root & Swoosh */}
          <path
            d="M 58 107
               C 70 114, 85 116, 100 113
               C 114 110, 128 102, 138 90
               C 136 103, 130 118, 122 131
               C 116 140, 110 144, 104 144
               C 99 144, 96 136, 94 126
               C 92 119, 87 119, 85 126
               C 83 136, 79 144, 74 144
               C 68 144, 63 135, 60 124
               C 57 115, 56 109, 58 107 Z"
            fill="url(#toothCyanGreenGrad)"
          />

          {/* White Negative Space Archway between Roots */}
          <path
            d="M 80 144
               C 85 144, 89 133, 90 124
               C 92 118, 96 118, 98 124
               C 99 133, 103 144, 108 144
               C 99 138, 89 138, 80 144 Z"
            fill="#ffffff"
          />

          {/* Sparkle 1 (Large 4-point star upper right) */}
          <path
            d="M 134 68 
               Q 134 74 140 74 
               Q 134 74 134 80 
               Q 134 74 128 74 
               Q 134 74 134 68 Z"
            fill="#0096c7"
          />

          {/* Sparkle 2 (Small 4-point star lower right) */}
          <path
            d="M 143 82 
               Q 143 86 147 86 
               Q 143 86 143 90 
               Q 143 86 139 86 
               Q 143 86 143 82 Z"
            fill="#0096c7"
          />
        </g>
      </svg>

      {showWordmark && (
        <div className="flex flex-col text-left justify-center leading-tight min-w-0">
          <span className={wordmarkClassName}>{wordmarkText}</span>
          {subtextText && <span className={subtextClassName}>{subtextText}</span>}
        </div>
      )}
    </div>
  );
};
