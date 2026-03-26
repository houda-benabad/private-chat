// Holds the Firebase ConfirmationResult between PhoneScreen and OTPScreen.
// Using a module-level store avoids passing a non-serializable object through
// navigation params (which triggers React Navigation warnings).

let _confirmationResult = null;

export function setConfirmationResult(result) {
  _confirmationResult = result;
}

export function getConfirmationResult() {
  return _confirmationResult;
}
