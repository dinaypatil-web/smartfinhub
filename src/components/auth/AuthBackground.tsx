import React from 'react';

export const AuthBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0 bg-[#06070a]">
      {/* Dynamic CSS animations for flowing liquid gold ribbons */}
      <style>{`
        @keyframes floatSlow1 {
          0%, 100% {
            transform: translateY(0px) scale(1) rotate(0deg);
          }
          50% {
            transform: translateY(-25px) scale(1.03) rotate(0.6deg);
          }
        }
        @keyframes floatSlow2 {
          0%, 100% {
            transform: translateY(0px) scale(1) rotate(0deg);
          }
          50% {
            transform: translateY(22px) scale(1.02) rotate(-0.8deg);
          }
        }
        @keyframes floatSlow3 {
          0%, 100% {
            transform: translateY(0px) scale(1) rotate(0deg);
          }
          50% {
            transform: translateY(-16px) scale(0.98) rotate(0.4deg);
          }
        }
        @keyframes metallicSheen {
          0% {
            stop-color: #78350f;
            offset: 0%;
          }
          50% {
            stop-color: #fef08a;
            offset: 50%;
          }
          100% {
            stop-color: #78350f;
            offset: 100%;
          }
        }
        @keyframes lightPulse {
          0%, 100% {
            opacity: 0.25;
            transform: scale(1);
          }
          50% {
            opacity: 0.55;
            transform: scale(1.15);
          }
        }
        @keyframes travelingSheen {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>

      {/* Atmospheric ambient glows */}
      <div 
        className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-amber-500/15 blur-[130px]"
        style={{ animation: 'lightPulse 7s ease-in-out infinite' }}
      />
      <div 
        className="absolute top-1/3 -right-40 w-[38rem] h-[38rem] rounded-full bg-amber-600/15 blur-[150px]"
        style={{ animation: 'lightPulse 9s ease-in-out infinite 2s' }}
      />
      <div 
        className="absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] rounded-full bg-yellow-500/10 blur-[140px]"
        style={{ animation: 'lightPulse 8s ease-in-out infinite 1s' }}
      />

      {/* Flowing Animated 3D Metallic Gold Silk Ribbons */}
      <svg
        className="absolute inset-0 w-full h-full object-cover"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Main Gold Ribbon Gradient */}
          <linearGradient id="fluidGoldGrad1" x1="0%" y1="30%" x2="100%" y2="70%">
            <stop offset="0%" stopColor="#1a1103" stopOpacity="0.85" />
            <stop offset="18%" stopColor="#78350f" />
            <stop offset="38%" stopColor="#d97706" />
            <stop offset="55%" stopColor="#fef08a" />
            <stop offset="72%" stopColor="#b45309" />
            <stop offset="90%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#180e03" stopOpacity="0.85" />
          </linearGradient>

          {/* Deep Bronze Accent Ribbon */}
          <linearGradient id="fluidGoldGrad2" x1="100%" y1="10%" x2="0%" y2="90%">
            <stop offset="0%" stopColor="#0c0702" stopOpacity="0.5" />
            <stop offset="25%" stopColor="#92400e" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#fde047" />
            <stop offset="85%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#080401" stopOpacity="0.9" />
          </linearGradient>

          {/* Slender Bright Specular Highlight */}
          <linearGradient id="specularGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.1" />
            <stop offset="35%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#fde047" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0.1" />
          </linearGradient>

          {/* Soft bloom filter for luxurious glow */}
          <filter id="fluidBloom" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="sharpGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Deep background wave (gentle float) */}
        <g style={{ animation: 'floatSlow1 12s ease-in-out infinite' }}>
          <path
            d="M-150 560 C 200 440, 520 720, 880 570 C 1200 430, 1420 640, 1650 540 L 1650 960 L -150 960 Z"
            fill="url(#fluidGoldGrad2)"
            opacity="0.4"
          />
        </g>

        {/* Voluptuous middle ribbon wave (liquid counter-motion) */}
        <g style={{ animation: 'floatSlow2 10s ease-in-out infinite' }}>
          <path
            d="M-100 660 C 260 510, 560 780, 930 600 C 1240 450, 1440 680, 1680 580 C 1480 780, 1200 640, 880 740 C 530 850, 180 670, -100 800 Z"
            fill="url(#fluidGoldGrad1)"
            filter="url(#fluidBloom)"
            opacity="0.8"
          />
        </g>

        {/* Upper swirling metallic silk wave */}
        <g style={{ animation: 'floatSlow3 8s ease-in-out infinite' }}>
          <path
            d="M-80 500 C 240 370, 570 600, 960 460 C 1270 330, 1470 520, 1650 440 C 1450 550, 1220 430, 930 520 C 590 630, 220 470, -80 580 Z"
            fill="url(#fluidGoldGrad1)"
            opacity="0.9"
          />

          {/* Shimmering specular edge highlights */}
          <path
            d="M-80 502 C 240 372, 570 602, 960 462 C 1270 332, 1470 522, 1650 442"
            stroke="url(#specularGold)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#sharpGlow)"
          />
        </g>

        {/* Lower bright metallic crest */}
        <g style={{ animation: 'floatSlow2 10s ease-in-out infinite' }}>
          <path
            d="M-100 663 C 260 513, 560 783, 930 603 C 1240 453, 1440 683, 1680 583"
            stroke="url(#specularGold)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#sharpGlow)"
            opacity="0.75"
          />
        </g>
      </svg>

      {/* Floating Sparkle Micro-dots */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/5 via-transparent to-transparent pointer-events-none" />

      {/* Radial center mask for optimal contrast */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(6, 7, 10, 0.45) 0%, rgba(6, 7, 10, 0.88) 75%, #06070a 100%)'
        }}
      />
    </div>
  );
};
