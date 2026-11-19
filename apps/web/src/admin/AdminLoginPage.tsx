import { useEffect, useRef, useState } from "react";
import { ApiError, getAdminSession, loginAccount, sendAuthOtp } from "../lib/api";
import {
  clearAuthSession,
  getAccessToken,
  persistAuth,
} from "../lib/authSession";
import { navigate, PATHS } from "../navigation";

const OTP_DIGITS = 4;
const OTP_RESEND_SECONDS = 60;

type Step = "phone" | "otp";

function emptyOtp(): string[] {
  return Array.from({ length: OTP_DIGITS }, () => "");
}

function formatOtpPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length) return `+91 ${digits}`;
  return "+91";
}

export function AdminLoginPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(emptyOtp);
  const [phoneAttempted, setPhoneAttempted] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(() => Boolean(getAccessToken()));
  const [otpSeconds, setOtpSeconds] = useState(OTP_RESEND_SECONDS);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const phoneOk = phone.replace(/\D/g, "").length === 10;

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setSessionChecking(false);
      return;
    }

    const controller = new AbortController();
    void getAdminSession(controller.signal)
      .then(() => {
        if (!controller.signal.aborted) navigate(PATHS.admin, { replace: true });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 403) {
          clearAuthSession();
          setAccessDenied(true);
        } else if (err instanceof ApiError && err.status === 401) {
          clearAuthSession();
        } else {
          clearAuthSession();
        }
        setSessionChecking(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (step !== "otp") return;
    const id = window.setInterval(() => {
      setOtpSeconds((value) => (value <= 0 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [step]);

  async function sendOtp() {
    setPhoneAttempted(true);
    setSendError("");
    setAccessDenied(false);
    if (!phoneOk || sendBusy) return;

    setSendBusy(true);
    try {
      await sendAuthOtp({
        phone: phone.replace(/\D/g, "").slice(0, 10),
        purpose: "login",
      });
      setOtp(emptyOtp());
      setOtpError(false);
      setOtpMessage("");
      setOtpSeconds(OTP_RESEND_SECONDS);
      setStep("otp");
    } catch (error) {
      setSendError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to send OTP. Please try again.",
      );
    } finally {
      setSendBusy(false);
    }
  }

  async function verifyOtp() {
    if (authBusy) return;
    if (otpError) {
      setOtp(emptyOtp());
      setOtpError(false);
      setOtpMessage("");
      otpRefs.current[0]?.focus();
      return;
    }

    const code = otp.join("");
    if (code.length !== OTP_DIGITS) {
      setOtpError(true);
      setOtpMessage("Enter the 4-digit OTP sent to your mobile number.");
      return;
    }

    setAuthBusy(true);
    setOtpError(false);
    setOtpMessage("");
    setAccessDenied(false);

    try {
      const result = await loginAccount({
        phone: phone.replace(/\D/g, "").slice(0, 10),
        otp: code,
      });
      persistAuth(result);

      try {
        await getAdminSession();
        navigate(PATHS.admin, { replace: true });
      } catch (err) {
        clearAuthSession();
        if (err instanceof ApiError && err.status === 403) {
          setAccessDenied(true);
          setStep("phone");
          setOtp(emptyOtp());
          setSendError("");
          return;
        }
        // 503 = API could not read roles/user_roles (grants/config), not a role denial.
        setOtpError(true);
        setOtpMessage(
          err instanceof ApiError
            ? err.message
            : "Unable to verify administrator access. Please try again.",
        );
      }
    } catch (error) {
      setOtpError(true);
      setOtpMessage(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to verify OTP. Please try again.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  if (sessionChecking) {
    return (
      <div className="ad-login">
        <div className="ad-login__panel">
          <p className="ad-login__checking">Checking administrator session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-login">
      <div className="ad-login__glow" aria-hidden="true" />
      <div className="ad-login__panel">
        <header className="ad-login__brand">
          <span className="ad-login__mark">aa</span>
          <div>
            <p className="ad-login__eyebrow">Aahaa Admin</p>
            <h1>Secure administrator sign-in</h1>
            <p className="ad-login__lead">
              Sign in with an administrator mobile number. Access is limited to accounts with the
              admin role.
            </p>
          </div>
        </header>

        {accessDenied ? (
          <div className="ad-login__alert" role="alert">
            <strong>Administrator access required</strong>
            <p>
              This account signed in successfully but does not have the admin role. Use an
              administrator account, or continue on the customer website.
            </p>
          </div>
        ) : null}

        {step === "phone" ? (
          <form
            className="ad-login__form"
            onSubmit={(event) => {
              event.preventDefault();
              void sendOtp();
            }}
          >
            <label className={phoneAttempted && !phoneOk ? "ad-login__field is-invalid" : "ad-login__field"}>
              <span>Mobile number</span>
              <span className="ad-login__phone-row">
                <span className="ad-login__cc">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder="Enter admin mobile number"
                  aria-label="Administrator mobile number"
                  aria-invalid={phoneAttempted && !phoneOk ? true : undefined}
                  value={phone}
                  autoFocus
                  onChange={(event) => {
                    setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
                    setPhoneAttempted(false);
                    setSendError("");
                    setAccessDenied(false);
                  }}
                />
              </span>
            </label>
            {phoneAttempted && !phoneOk ? (
              <p className="ad-login__error">Enter a 10-digit mobile number.</p>
            ) : null}
            {sendError ? (
              <p className="ad-login__error" role="alert">
                {sendError}
              </p>
            ) : null}
            <p className="ad-login__hint">We&apos;ll send a 4-digit OTP to verify this number.</p>
            <button className="ad-login__submit" type="submit" disabled={sendBusy}>
              {sendBusy ? "Sending OTP…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form
            className="ad-login__form"
            onSubmit={(event) => {
              event.preventDefault();
              void verifyOtp();
            }}
          >
            <p className="ad-login__otp-lead">
              Enter the 4-digit OTP sent to <strong>{formatOtpPhone(phone)}</strong>
            </p>
            <button
              className="ad-login__link-btn"
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp(emptyOtp());
                setOtpError(false);
                setOtpMessage("");
              }}
            >
              Change mobile number
            </button>

            <div className="ad-login__otp-row">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  className={otpError ? "ad-login__otp-digit is-error" : "ad-login__otp-digit"}
                  ref={(node) => {
                    otpRefs.current[index] = node;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={OTP_DIGITS}
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
                    const chars = raw.slice(0, OTP_DIGITS - index).split("");
                    chars.forEach((value, offset) => {
                      digits[index + offset] = value;
                    });
                    setOtp(digits);
                    setOtpError(false);
                    otpRefs.current[Math.min(index + chars.length, OTP_DIGITS - 1)]?.focus();
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
                    const pasted = event.clipboardData
                      .getData("text")
                      .replace(/\D/g, "")
                      .slice(0, OTP_DIGITS)
                      .split("");
                    if (!pasted.length) return;
                    const digits = emptyOtp();
                    pasted.forEach((value, offset) => {
                      digits[offset] = value;
                    });
                    setOtp(digits);
                    setOtpError(false);
                    otpRefs.current[Math.min(pasted.length, OTP_DIGITS - 1)]?.focus();
                  }}
                />
              ))}
            </div>

            {otpError ? (
              <p className="ad-login__error" role="alert">
                {otpMessage || "That OTP isn’t correct. Check the code and try again."}
              </p>
            ) : null}

            <button className="ad-login__submit" type="submit" disabled={authBusy}>
              {authBusy ? "Verifying…" : "Verify & continue"}
            </button>

            {otpError || otpSeconds <= 0 ? (
              <p className="ad-login__resend">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  disabled={sendBusy}
                  onClick={() => {
                    void (async () => {
                      setSendBusy(true);
                      setOtpError(false);
                      setOtpMessage("");
                      try {
                        await sendAuthOtp({
                          phone: phone.replace(/\D/g, "").slice(0, 10),
                          purpose: "login",
                        });
                        setOtp(emptyOtp());
                        setOtpSeconds(OTP_RESEND_SECONDS);
                        otpRefs.current[0]?.focus();
                      } catch (error) {
                        setOtpError(true);
                        setOtpMessage(
                          error instanceof ApiError
                            ? error.message
                            : error instanceof Error
                              ? error.message
                              : "Unable to resend OTP. Please try again.",
                        );
                      } finally {
                        setSendBusy(false);
                      }
                    })();
                  }}
                >
                  {sendBusy ? "Sending…" : "Resend OTP"}
                </button>
              </p>
            ) : (
              <p className="ad-login__resend">
                Resend OTP in <strong>00:{String(otpSeconds).padStart(2, "0")}</strong>
              </p>
            )}

            <button
              className="ad-login__link-btn ad-login__back"
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp(emptyOtp());
                setOtpError(false);
                setOtpMessage("");
              }}
            >
              ← Back to mobile number
            </button>
          </form>
        )}

        <footer className="ad-login__foot">
          <button type="button" onClick={() => navigate(PATHS.home)}>
            Customer website
          </button>
        </footer>
      </div>
    </div>
  );
}
