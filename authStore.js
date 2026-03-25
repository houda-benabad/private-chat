// Holds the Firebase ConfirmationResult between PhoneScreen and OTPScreen.
// Not stored in navigation params because the object is not serializable.
let _confirmationResult = null;

export const setConfirmationResult = (result) => {
  _confirmationResult = result;
};

export const getConfirmationResult = () => _confirmationResult;
