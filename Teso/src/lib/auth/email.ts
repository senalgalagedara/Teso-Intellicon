/**
 * Mock email service to simulate sending emails during development.
 * In a real production app, you would use a service like SendGrid, AWS SES, or Nodemailer here.
 */

export async function sendVerificationEmail(email: string, token: string) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  console.log('----------------------------------------------------');
  console.log(`[EMAIL SERVICE] Sending Verification Email to: ${email}`);
  console.log(`[EMAIL SERVICE] Verification Link: http://localhost:3000/auth/verify-email?token=${token}`);
  console.log('----------------------------------------------------');
}

export async function sendPasswordResetEmail(email: string, token: string) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('----------------------------------------------------');
  console.log(`[EMAIL SERVICE] Sending Password Reset Email to: ${email}`);
  console.log(`[EMAIL SERVICE] Reset Link: http://localhost:3000/auth/reset-password?token=${token}`);
  console.log('----------------------------------------------------');
}
