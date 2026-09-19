"use client";

import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "canastas-verdes-cookie-consent";

type ConsentValue = "accepted" | "rejected";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);

      if (consent !== "accepted" && consent !== "rejected") {
        setVisible(true);
      }
    } catch {
      // Si localStorage no está disponible, mostramos el aviso.
      setVisible(true);
    }
  }, []);

  const saveConsent = (value: ConsentValue) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, value);
    } catch {
      // No bloqueamos la navegación si localStorage falla.
    }

    setClosing(true);

    window.setTimeout(() => {
      setVisible(false);
    }, 250);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`cookie-consent ${closing ? "cookie-consent--closing" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="cookie-consent__content">
        <div className="cookie-consent__icon" aria-hidden="true">
          🍪
        </div>

        <div className="cookie-consent__text">
          <h2 id="cookie-consent-title">
            Tu privacidad importa
          </h2>

          <p id="cookie-consent-description">
            Utilizamos cookies necesarias para que Canastas Verdes
            funcione correctamente y para mejorar tu experiencia de
            navegación.
          </p>

          <a
            href="/politica-cookies"
            className="cookie-consent__link"
          >
            Política de cookies
          </a>
        </div>

        <div className="cookie-consent__actions">
          <button
            type="button"
            className="cookie-consent__button cookie-consent__button--reject"
            onClick={() => saveConsent("rejected")}
          >
            No aceptar
          </button>

          <button
            type="button"
            className="cookie-consent__button cookie-consent__button--accept"
            onClick={() => saveConsent("accepted")}
          >
            Aceptar cookies
          </button>
        </div>
      </div>

      <style jsx>{`
        .cookie-consent {
          position: fixed;
          z-index: 9999;
          left: 24px;
          right: 24px;
          bottom: 24px;

          background: #ffffff;
          border: 1px solid #cfe3d2;
          border-radius: 18px;
          box-shadow: 0 12px 40px rgba(23, 53, 31, 0.18);

          animation: cookieConsentEnter 0.3s ease-out;
        }

        .cookie-consent--closing {
          animation: cookieConsentExit 0.25s ease-in forwards;
        }

        .cookie-consent__content {
          display: flex;
          align-items: center;
          gap: 18px;

          max-width: 1200px;
          margin: 0 auto;
          padding: 20px 24px;
        }

        .cookie-consent__icon {
          flex: 0 0 auto;

          width: 48px;
          height: 48px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;
          background: #dff1e2;

          font-size: 23px;
        }

        .cookie-consent__text {
          flex: 1;
          min-width: 0;
        }

        .cookie-consent__text h2 {
          margin: 0 0 5px;

          color: #17351f;
          font-size: 17px;
          font-weight: 700;
          line-height: 1.3;
        }

        .cookie-consent__text p {
          margin: 0;

          color: #5f7465;
          font-size: 14px;
          line-height: 1.5;
        }

        .cookie-consent__link {
          display: inline-block;
          margin-top: 5px;

          color: #1f6b3a;
          font-size: 13px;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .cookie-consent__link:hover {
          color: #174f2b;
        }

        .cookie-consent__actions {
          flex: 0 0 auto;

          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cookie-consent__button {
          min-height: 42px;
          padding: 0 18px;

          border-radius: 9px;
          border: 1px solid transparent;

          font-family: inherit;
          font-size: 14px;
          font-weight: 600;

          cursor: pointer;
          transition:
            background-color 0.2s ease,
            border-color 0.2s ease,
            transform 0.15s ease;
        }

        .cookie-consent__button:active {
          transform: scale(0.97);
        }

        .cookie-consent__button--reject {
          color: #1f6b3a;
          background: #ffffff;
          border-color: #cfe3d2;
        }

        .cookie-consent__button--reject:hover {
          background: #f1f8f2;
          border-color: #1f6b3a;
        }

        .cookie-consent__button--accept {
          color: #ffffff;
          background: #1f6b3a;
        }

        .cookie-consent__button--accept:hover {
          background: #174f2b;
        }

        .cookie-consent__button:focus-visible,
        .cookie-consent__link:focus-visible {
          outline: 3px solid rgba(31, 107, 58, 0.25);
          outline-offset: 2px;
        }

        @keyframes cookieConsentEnter {
          from {
            opacity: 0;
            transform: translateY(20px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cookieConsentExit {
          from {
            opacity: 1;
            transform: translateY(0);
          }

          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }

        @media (max-width: 768px) {
          .cookie-consent {
            left: 12px;
            right: 12px;
            bottom: 12px;

            border-radius: 16px;
          }

          .cookie-consent__content {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 12px;

            padding: 18px;
          }

          .cookie-consent__icon {
            width: 42px;
            height: 42px;
            font-size: 20px;
          }

          .cookie-consent__text h2 {
            font-size: 16px;
          }

          .cookie-consent__text p {
            font-size: 13px;
          }

          .cookie-consent__actions {
            grid-column: 1 / -1;

            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;

            margin-top: 4px;
          }

          .cookie-consent__button {
            width: 100%;
            min-height: 44px;
            padding: 0 10px;

            font-size: 13px;
          }
        }

        @media (max-width: 420px) {
          .cookie-consent {
            left: 8px;
            right: 8px;
            bottom: 8px;
          }

          .cookie-consent__content {
            padding: 16px;
          }

          .cookie-consent__icon {
            width: 38px;
            height: 38px;
            font-size: 18px;
          }

          .cookie-consent__text p {
            font-size: 12.5px;
          }

          .cookie-consent__link {
            font-size: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cookie-consent,
          .cookie-consent--closing {
            animation: none;
          }

          .cookie-consent__button {
            transition: none;
          }
        }
      `}
      </style>
    </div>
  );
}
