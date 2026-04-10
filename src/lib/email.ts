export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/auth/verify-email?token=${token}`;

  // Development: log to console. Replace with a transactional email service for production.
  console.log(`\n📧 Verification email for ${email}:\n${url}\n`);
}
