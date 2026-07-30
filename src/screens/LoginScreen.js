import React from 'react';
import EmployeePhoneAuthScreen from './EmployeePhoneAuthScreen';

// Employee authentication begins with the admin-registered Mongolian phone number.
// PIN setup is shown only after verify.mn confirms phone ownership.
export default function LoginScreen() {
  return <EmployeePhoneAuthScreen />;
}
