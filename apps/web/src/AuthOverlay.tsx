import { useEffect, useRef, useState } from "react";
import * as a from "./assets/landing";
import { navigate, PATHS } from "./navigation";

type AuthScreen = "login" | "register" | "otp" | "register-otp" | "register-success";

/** Preview-only mock code. Never treated as a real SMS OTP. */
const DEV_OTP = "123456";

function formatOtpPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length) return `+91 ${digits}`;
  return "+91";
}

export function AuthOverlay({
  screen,
  phone,
  setPhone,
}: {
  screen: AuthScreen;
  phone: string;
  setPhone: (value: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registerAttempted, setRegisterAttempted] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState(false);
  const [otpSeconds, setOtpSeconds] = useState(30);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const isRegisterOtp = screen === "register-otp";
  const isRegisterSuccess = screen === "register-success";
  const isRegisterFlow = screen === "register" || isRegisterOtp || isRegisterSuccess;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onViewport = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onViewport);
    return () => mq.removeEventListener("change", onViewport);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate(PATHS.home);
    };
    const html = document.documentElement;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (screen !== "otp" && screen !== "register-otp") return;
    setOtp(["", "", "", "", "", ""]);
    setOtpError(false);
    setOtpSeconds(30);
  }, [screen]);

  useEffect(() => {
    if (screen !== "otp" && screen !== "register-otp") return;
    const id = window.setInterval(() => {
      setOtpSeconds((value) => (value <= 0 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [screen]);

  const title = screen === "register" ? "Create account" : "Log in";
  const nameOk = name.trim().length > 1;
  const phoneOk = phone.replace(/\D/g, "").length === 10;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const registerOk = nameOk && phoneOk && emailOk;

  return (
    <div
      className={isRegisterFlow ? "lp-login-overlay lp-register-overlay" : "lp-login-overlay"}
      onClick={() => navigate(PATHS.home)}
      role="presentation"
    >
      <aside
        className={isRegisterFlow ? "lp-login-panel lp-register-panel" : "lp-login-panel"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lp-login-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="lp-login-close" type="button" aria-label="Close" onClick={() => navigate(PATHS.home)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {screen === "login" || screen === "register" ? (
          <div className={screen === "register" ? "lp-login-head lp-register-desktop-head" : "lp-login-head"}>
            <div>
              <h2 className="lp-login-title" id="lp-login-title">
                {title}
              </h2>
              {screen === "login" ? (
                <p className="lp-login-signup">
                  or{" "}
                  <button type="button" onClick={() => navigate(PATHS.register)}>
                    create an account
                  </button>
                </p>
              ) : null}
              {screen === "register" ? (
                <p className="lp-login-signup">
                  Already a member?{" "}
                  <button type="button" onClick={() => navigate(PATHS.login)}>
                    Log in
                  </button>
                </p>
              ) : null}
              <span className="lp-login-rule" aria-hidden="true" />
            </div>
            <img className="lp-login-tiffin" src={a.imgLoginTiffin} alt="" />
          </div>
        ) : null}

        {screen === "login" ? (
          <form
            className="lp-login-form"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(PATHS.otp);
            }}
          >
            <PhoneField phone={phone} setPhone={setPhone} autoFocus />
            <p className="lp-login-hint">We&apos;ll send a 6-digit OTP to your mobile number.</p>
            <button className="lp-login-otp" type="submit">
              Send OTP
            </button>
            <LegalLinks />
          </form>
        ) : null}

        {screen === "register" ? (
          <form
            className="lp-login-form lp-register-form"
            onSubmit={(event) => {
              event.preventDefault();
              setRegisterAttempted(true);
              if (!registerOk) return;
              navigate(PATHS.registerOtp);
            }}
          >
            <div className="lp-register-mobile-head">
              <button className="lp-register-back-icon" type="button" aria-label="Back to login" onClick={() => navigate(PATHS.login)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="lp-register-brand">aahaa</p>
              <div className="lp-register-mobile-title-row">
                <div>
                  <h2 className="lp-register-mobile-title">Create your account</h2>
                  <p className="lp-register-mobile-lead">Enter your details. We&apos;ll send an OTP to your mobile number.</p>
                </div>
                <img className="lp-login-tiffin" src={a.imgLoginTiffin} alt="" />
              </div>
            </div>

            <label className={registerAttempted && !nameOk ? "lp-login-field is-invalid" : "lp-login-field"}>
              <span className="lp-login-field-label">Full name</span>
              <span className="lp-register-icon-row">
                <UserIcon />
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  aria-label="Full name"
                  value={name}
                  autoFocus
                  onChange={(event) => setName(event.target.value)}
                />
              </span>
            </label>
            {registerAttempted && !nameOk ? <p className="lp-register-field-error">Enter your full name.</p> : null}

            <div className="lp-register-phone">
              <PhoneField phone={phone} setPhone={setPhone} leadingIcon invalid={registerAttempted && !phoneOk} />
            </div>
            {registerAttempted && !phoneOk ? <p className="lp-register-field-error">Enter a 10-digit mobile number.</p> : null}

            <p className="lp-login-hint lp-register-mobile-phone-hint">We&apos;ll send a 6-digit OTP to this number.</p>

            <label className={registerAttempted && !emailOk ? "lp-login-field is-invalid" : "lp-login-field"}>
              <span className="lp-login-field-label lp-register-desktop-only">Email ID</span>
              <span className="lp-login-field-label lp-register-mobile-only">Email address</span>
              <span className="lp-register-icon-row">
                <MailIcon />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={isMobile ? "Enter your email" : "Enter your email address"}
                  aria-label={isMobile ? "Email address" : "Email ID"}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </span>
            </label>
            {registerAttempted && !emailOk ? <p className="lp-register-field-error">Enter a valid email address.</p> : null}

            <p className="lp-login-hint lp-register-desktop-hint">OTP will be sent only to your mobile number.</p>
            <button className="lp-login-otp lp-register-submit" type="submit">
              <span className="lp-register-desktop-cta">Send OTP</span>
              <span className="lp-register-mobile-cta">Continue</span>
            </button>
            <p className="lp-login-legal lp-register-legal">
              <span className="lp-register-desktop-only">
                By continuing, you agree to our
                <br />
              </span>
              <span className="lp-register-mobile-only">By creating an account, you agree to our </span>
              <button type="button" onClick={() => navigate(PATHS.terms)}>
                <span className="lp-register-desktop-only">Terms of service</span>
                <span className="lp-register-mobile-only">Terms of Service</span>
              </button>{" "}
              and{" "}
              <button type="button" onClick={() => navigate(PATHS.privacy)}>
                <span className="lp-register-desktop-only">Privacy policy</span>
                <span className="lp-register-mobile-only">Privacy Policy</span>
              </button>
              .
            </p>
          </form>
        ) : null}

        {screen === "otp" || isRegisterOtp ? (
          <form
            className={isRegisterOtp ? "lp-otp lp-register-otp" : "lp-otp"}
            onSubmit={(event) => {
              event.preventDefault();
              if (otpError) {
                setOtp(["", "", "", "", "", ""]);
                setOtpError(false);
                setOtpSeconds(30);
                otpRefs.current[0]?.focus();
                return;
              }
              if (otp.join("") === DEV_OTP) {
                setOtpError(false);
                navigate(isRegisterOtp ? PATHS.registerSuccess : PATHS.cooks);
                return;
              }
              setOtpError(true);
            }}
          >
            {isRegisterOtp ? (
              <div className="lp-register-otp-mobile-bar">
                <button className="lp-register-back-icon" type="button" aria-label="Back to create account" onClick={() => navigate(PATHS.register)}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <p className="lp-register-brand">aahaa</p>
              </div>
            ) : null}
            {isRegisterOtp ? (
              <p className="lp-otp-step">
                <span className="lp-register-desktop-only">CREATE ACCOUNT · STEP 2 OF 2</span>
                <span className="lp-register-mobile-only">STEP 2 OF 2</span>
              </p>
            ) : (
              <p className="lp-otp-step">LOG IN · STEP 2 OF 2</p>
            )}
            {isRegisterOtp ? (
              <div className="lp-register-otp-title-row">
                <h2 className="lp-otp-title" id="lp-login-title">
                  Verify your number
                </h2>
                <img className="lp-login-tiffin lp-register-otp-tiffin" src={a.imgLoginTiffin} alt="" />
              </div>
            ) : (
              <h2 className="lp-otp-title" id="lp-login-title">
                Verify your number
              </h2>
            )}
            <p className="lp-otp-lead">
              Enter the 6-digit OTP sent by SMS to
              <br />
              <strong>{formatOtpPhone(phone)}</strong>
            </p>
            <button className="lp-otp-change" type="button" onClick={() => navigate(isRegisterOtp ? PATHS.register : PATHS.login)}>
              Change mobile number
            </button>
            <div className="lp-otp-row">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  className={otpError ? "lp-otp-digit is-error" : "lp-otp-digit"}
                  ref={(node) => {
                    otpRefs.current[index] = node;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={6}
                  aria-label={`OTP digit ${index + 1}`}
                  aria-invalid={otpError || undefined}
                  value={digit}
                  autoFocus={index === 0}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => {
                    let raw = event.target.value.replace(/\D/g, "");
                    const digits = [...otp];
                    if (!raw) {
                      digits[index] = "";
                      setOtp(digits);
                      setOtpError(false);
                      return;
                    }
                    if (otp[index] && raw.startsWith(otp[index]) && raw.length > 1) {
                      raw = raw.slice(otp[index].length);
                    }
                    const chars = raw.slice(0, 6 - index).split("");
                    chars.forEach((value, offset) => {
                      digits[index + offset] = value;
                    });
                    setOtp(digits);
                    setOtpError(false);
                    otpRefs.current[Math.min(index + chars.length, 5)]?.focus();
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Backspace") return;
                    if (otp[index]) return;
                    if (index === 0) return;
                    event.preventDefault();
                    const digits = [...otp];
                    digits[index - 1] = "";
                    setOtp(digits);
                    setOtpError(false);
                    otpRefs.current[index - 1]?.focus();
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
                    if (!pasted.length) return;
                    const digits = ["", "", "", "", "", ""];
                    pasted.forEach((value, offset) => {
                      digits[offset] = value;
                    });
                    setOtp(digits);
                    setOtpError(false);
                    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
                  }}
                />
              ))}
            </div>
            {otpError ? <p className="lp-otp-error">That OTP isn&apos;t correct. Check the code and try again.</p> : null}
            <button className="lp-login-otp" type="submit">
              {isRegisterOtp ? (
                <>
                  <span className="lp-register-desktop-cta">Verify & create account</span>
                  <span className="lp-register-mobile-cta">Verify & Continue</span>
                </>
              ) : (
                "Verify & log in"
              )}
            </button>
            {otpError || otpSeconds <= 0 ? (
              <p className="lp-otp-resend">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setOtpError(false);
                    setOtpSeconds(30);
                  }}
                >
                  Resend OTP
                </button>
              </p>
            ) : (
              <p className="lp-otp-resend">
                Resend OTP in <strong>00:{String(otpSeconds).padStart(2, "0")}</strong>
              </p>
            )}
            {isRegisterOtp ? <p className="lp-otp-note">Verification is by mobile number only.</p> : null}
            <button className="lp-otp-back" type="button" onClick={() => navigate(isRegisterOtp ? PATHS.register : PATHS.login)}>
              <span aria-hidden="true">←</span> {isRegisterOtp ? "Back to create account" : "Back to login"}
            </button>
          </form>
        ) : null}

        {isRegisterSuccess ? (
          <div className="lp-register-success">
            <p className="lp-register-brand lp-register-success-brand">aahaa</p>
            <div className="lp-register-success-body">
              <span className="lp-register-success-check" aria-hidden="true">
                <SuccessCheck />
              </span>
              <div className="lp-register-success-tiffin-wrap" aria-hidden="true">
                <img className="lp-register-success-tiffin" src={a.imgLoginTiffin} alt="" />
                <span className="lp-register-success-badge">
                  <SuccessCheck />
                </span>
              </div>
              <h2 className="lp-otp-title lp-register-success-title" id="lp-login-title">
                <span className="lp-register-desktop-only">Account created!</span>
                <span className="lp-register-mobile-only">Account created successfully!</span>
              </h2>
              <p className="lp-register-success-copy lp-register-desktop-only">
                Your mobile number is verified.
                <br />
                Welcome to aahaa—a little home on every journey.
              </p>
              <p className="lp-register-success-copy lp-register-mobile-only">
                Your mobile number has been verified.
                <br />
                You&apos;re all set to explore homemade meals
                <br />
                on Aahaa.
              </p>
            </div>
            <button className="lp-login-otp lp-register-success-cta" type="button" onClick={() => navigate(PATHS.cooks)}>
              <span className="lp-register-desktop-cta">Find home-cooked food</span>
              <span className="lp-register-mobile-cta">Continue</span>
            </button>
            <p className="lp-register-success-note lp-register-desktop-only">You&apos;re now logged in and ready to order.</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function SuccessCheck() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M7.5 14.2l4.2 4.2L20.5 9.6" stroke="#5f8f4e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="lp-register-field-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="6.5" r="2.75" stroke="#ac9692" strokeWidth="1.4" />
      <path d="M4.5 16c.4-2.8 2.4-4.2 5.5-4.2s5.1 1.4 5.5 4.2" stroke="#ac9692" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return <img className="lp-register-field-icon" src={a.imgLetterStreamlineSolarAr} alt="" width={20} height={20} />;
}

function PhoneIcon() {
  return (
    <svg className="lp-register-field-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.2 3.8h5.6c.9 0 1.6.7 1.6 1.6v9.2c0 .9-.7 1.6-1.6 1.6H7.2c-.9 0-1.6-.7-1.6-1.6V5.4c0-.9.7-1.6 1.6-1.6Z"
        stroke="#ac9692"
        strokeWidth="1.4"
      />
      <path d="M9 14.6h2" stroke="#ac9692" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PhoneField({
  phone,
  setPhone,
  autoFocus,
  leadingIcon,
  invalid,
}: {
  phone: string;
  setPhone: (value: string) => void;
  autoFocus?: boolean;
  leadingIcon?: boolean;
  invalid?: boolean;
}) {
  return (
    <label className={invalid ? "lp-login-field is-invalid" : "lp-login-field"}>
      <span className="lp-login-field-label">Mobile number</span>
      <span className="lp-login-field-row">
        {leadingIcon ? <PhoneIcon /> : null}
        <span className="lp-login-cc">+91</span>
        {leadingIcon ? (
          <span className="lp-register-cc-caret" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 4.5L6 8l3.5-3.5" stroke="#ac9692" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : null}
        <span className="lp-login-sep" aria-hidden="true" />
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          placeholder="Enter mobile number"
          aria-label="Mobile number"
          value={phone}
          autoFocus={autoFocus}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
        />
      </span>
    </label>
  );
}

function LegalLinks() {
  return (
    <p className="lp-login-legal">
      By continuing, you agree to our
      <br />
      <button type="button" onClick={() => navigate(PATHS.terms)}>
        Terms of service
      </button>{" "}
      and{" "}
      <button type="button" onClick={() => navigate(PATHS.privacy)}>
        Privacy policy
      </button>
      .
    </p>
  );
}
