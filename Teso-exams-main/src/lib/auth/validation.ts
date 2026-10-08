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
    role: z.enum(['student', 'host']).default('student'),
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
      .optional()
      .transform(val => (typeof val === 'string' && val.trim() !== '' ? parseInt(val, 10) : val))
      .pipe(
        z
          .number({ message: 'Age must be a number' })
          .int('Age must be a whole number')
          .min(10, 'Age must be at least 10')
          .max(100, 'Age must be 100 or less')
          .optional()
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

export const joinExamSchema = z.object({
  examCode: z
    .string()
    .trim()
    .min(4, 'Exam code must be at least 4 characters')
    .max(50, 'Exam code is too long')
    .regex(/^[A-Za-z0-9\-_]+$/, 'Exam code contains invalid characters'),
});

export const candidateIdentitySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long'),
  classCode: z
    .string()
    .trim()
    .min(2, 'Class code must be at least 2 characters')
    .max(50, 'Class code is too long'),
  examCode: z
    .string()
    .trim()
    .min(4, 'Exam code is required and must be at least 4 characters'),
});

export const hostPaperSchema = z.object({
  paperTitle: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title is too long'),
  examDate: z
    .string()
    .min(1, 'Exam date is required')
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
  numberOfStudents: z
    .number({ message: 'Capacity must be a number' })
    .int('Capacity must be a whole number')
    .min(1, 'Minimum 1 student')
    .max(500, 'Maximum 500 students'),
  questionCount: z
    .number({ message: 'Question count must be a number' })
    .int('Question count must be a whole number')
    .min(1, 'Minimum 1 question')
    .max(100, 'Maximum 100 questions'),
  answersPerQuestion: z
    .number({ message: 'Options count must be a number' })
    .int('Options count must be a whole number')
    .min(2, 'Minimum 2 options')
    .max(5, 'Maximum 5 options'),
  examDurationMins: z
    .number({ message: 'Duration must be a number' })
    .int('Duration must be a whole number')
    .min(1, 'Minimum 1 minute')
    .max(360, 'Maximum 360 minutes'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: strongPasswordSchema,
});
