import { useState } from "react";

export default function QuizApp() {
  const [currentQuestion] = useState(3);
  const [selected, setSelected] = useState(null);
  const totalQuestions = 20;
  const progress = (currentQuestion / totalQuestions) * 100;

  const word = "Förnäm";
  const options = ["Viktig", "Ödmjuk", "Långsam", "Sliten"];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#cdd0d6",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif',
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          width: 375,
          height: 770,
          background: "#eef0f4",
          borderRadius: 50,
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.55)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 126,
            height: 28,
            background: "#111",
            borderRadius: "0 0 18px 18px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 7,
              left: "50%",
              transform: "translateX(-50%)",
              width: 9,
              height: 9,
              background: "#1e1e2a",
              borderRadius: "50%",
              boxShadow: "inset 0 0 2px rgba(255,255,255,0.06)",
            }}
          />
        </div>

        {/* Status bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 26px 0",
            height: 44,
            fontSize: 15,
            fontWeight: 600,
            color: "#1a1a1a",
            letterSpacing: "0.2px",
          }}
        >
          <span style={{ width: 54 }}>9:41</span>
          <div style={{ width: 54 }} />
          <div style={{ display: "flex", gap: 5, alignItems: "center", width: 54, justifyContent: "flex-end" }}>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
              <rect x="0" y="6.5" width="2.8" height="4.5" rx="0.6" fill="#1a1a1a" />
              <rect x="4" y="4.2" width="2.8" height="6.8" rx="0.6" fill="#1a1a1a" />
              <rect x="8" y="1.8" width="2.8" height="9.2" rx="0.6" fill="#1a1a1a" />
              <rect x="12" y="0" width="2.8" height="11" rx="0.6" fill="#1a1a1a" />
            </svg>
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
              <path d="M7 2.8C8.8 2.8 10.4 3.5 11.5 4.7L12.8 3.4C11.3 1.8 9.3 0.8 7 0.8C4.7 0.8 2.7 1.8 1.2 3.4L2.5 4.7C3.6 3.5 5.2 2.8 7 2.8Z" fill="#1a1a1a"/>
              <path d="M7 5.8C8.1 5.8 9.1 6.2 9.8 7L11.1 5.7C10 4.6 8.6 3.8 7 3.8C5.4 3.8 4 4.6 2.9 5.7L4.2 7C4.9 6.2 5.9 5.8 7 5.8Z" fill="#1a1a1a"/>
              <circle cx="7" cy="9.2" r="1.3" fill="#1a1a1a"/>
            </svg>
            <svg width="24" height="11" viewBox="0 0 24 11" fill="none">
              <rect x="0.5" y="0.5" width="20" height="10" rx="2" stroke="#1a1a1a" strokeOpacity="0.3"/>
              <rect x="21.5" y="3" width="1.5" height="5" rx="0.5" fill="#1a1a1a" fillOpacity="0.35"/>
              <rect x="2" y="2" width="14" height="7" rx="1" fill="#1a1a1a"/>
            </svg>
          </div>
        </div>

        {/* Overflow menu */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "4px 26px 0",
          }}
        >
          <div
            style={{
              padding: "8px 4px",
              cursor: "pointer",
              opacity: 0.3,
            }}
          >
            <svg width="16" height="4" viewBox="0 0 16 4" fill="#1a1a1a">
              <circle cx="2" cy="2" r="1.6" />
              <circle cx="8" cy="2" r="1.6" />
              <circle cx="14" cy="2" r="1.6" />
            </svg>
          </div>
        </div>

        {/* Main content — anchored in upper-center, not floating */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "0 22px",
            paddingTop: 52,
          }}
        >
          {/* Word block */}
          <div style={{ textAlign: "center", marginBottom: 28, width: "100%" }}>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#111114",
                letterSpacing: "-0.7px",
                margin: "0 0 10px 0",
                lineHeight: 1.1,
              }}
            >
              {word}
            </h1>
            {/* Underline — slightly more visible, refined */}
            <div
              style={{
                width: 38,
                height: 2.5,
                background: "linear-gradient(90deg, #8ec8d4 0%, #a8d8e4 100%)",
                borderRadius: 2,
                margin: "0 auto",
                opacity: 0.9,
              }}
            />
          </div>

          {/* Answer cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9, width: "100%" }}>
            {options.map((option, idx) => {
              const isSelected = selected === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelected(idx)}
                  style={{
                    width: "100%",
                    padding: "15px 20px",
                    borderRadius: 12,
                    border: isSelected
                      ? "1.5px solid #7abbc8"
                      : "1px solid rgba(0,0,0,0.07)",
                    background: isSelected ? "#f5fafb" : "#ffffff",
                    color: "#111114",
                    fontSize: 16.5,
                    fontWeight: 450,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    fontFamily: "inherit",
                    outline: "none",
                    /* Stronger card elevation matching reference */
                    boxShadow: isSelected
                      ? "0 3px 14px rgba(122,187,200,0.22), 0 1px 4px rgba(0,0,0,0.07)"
                      : "0 3px 12px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.05)",
                    letterSpacing: "-0.1px",
                    lineHeight: 1.3,
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "#f8f8fa";
                      e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)";
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.11), 0 1px 3px rgba(0,0,0,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "#ffffff";
                      e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)";
                      e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.05)";
                    }
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* Spacer to push progress toward bottom */}
          <div style={{ flex: 1 }} />

          {/* Progress area — more polished, better anchored */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              paddingBottom: 28,
            }}
          >
            {/* Progress label */}
            <span
              style={{
                fontSize: 12,
                color: "#a8a8b0",
                fontWeight: 500,
                letterSpacing: "0.25px",
              }}
            >
              Fråga {currentQuestion} av {totalQuestions}
            </span>

            {/* Progress bar — slightly more substantial track */}
            <div
              style={{
                width: 148,
                height: 3.5,
                background: "#dcdce0",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #96c8d4 0%, #b2d8e2 100%)",
                  borderRadius: 2,
                  transition: "width 0.35s ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 10 }}>
          <div
            style={{
              width: 134,
              height: 5,
              background: "#1a1a1a",
              borderRadius: 3,
              opacity: 0.14,
            }}
          />
        </div>
      </div>
    </div>
  );
}