import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters long');

export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: passwordSchema,
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').optional(),
});

export const otpVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Verification code must be exactly 6 numeric digits'),
});

export const signUpStep1Schema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name is too long'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Last name is required')
      .max(50, 'Last name is too long'),
    age: z
      .union([z.string(), z.number()])
      .transform(val => (typeof val === 'string' ? parseInt(val, 10) : val))
      .pipe(
        z
          .number({ message: 'Age must be a number' })
          .int('Age must be a whole number')
          .min(10, 'Age must be at least 10')
          .max(100, 'Age must be 100 or less')
      ),
    email: z
      .string()
      .trim()
      .min(1, 'Email address is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreedToTerms: z
      .boolean()
      .refine(val => val === true, 'You must agree to the Terms and Privacy Policy'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const signUpStep3Schema = z.object({
  grade: z.string().min(1, 'Please select a grade'),
  targetedExam: z.enum(['A/L', 'O/L']),
  monthsToExam: z
    .union([z.string(), z.number()])
    .transform(val => (typeof val === 'string' ? parseInt(val, 10) : val))
    .pipe(
      z
        .number({ message: 'Months to exam must be a number' })
        .int('Must be a whole number')
        .min(1, 'Must be at least 1 month')
        .max(60, 'Maximum 60 months')
    ),
  stream: z.string().min(1, 'Please select a stream').optional(),
  subjects: z.array(z.string()).min(1, 'Please select at least 1 subject').optional(),
});

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or less'),
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters long')
    .max(2000, 'Message is too long (maximum 2000 characters)'),
  role: z
    .enum(['student', 'teacher', 'institution', 'host', 'other'])
    .optional()
    .default('student'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: strongPasswordSchema,
});
