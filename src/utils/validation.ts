import { z } from "zod";

// PAN Number validation regex: 5 letters, 4 digits, 1 letter
// Example: ABCDE1234F
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const panNumberSchema = z
  .string()
  .trim()
  .min(1, "PAN number is required")
  .length(10, "PAN number must be exactly 10 characters")
  .regex(
    PAN_REGEX,
    "Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)"
  )
  .transform((val) => val.toUpperCase());

export const validatePanNumber = (
  value: string
): { isValid: boolean; error?: string; formatted?: string } => {
  const upperValue = value.toUpperCase().trim();

  if (!upperValue) {
    return { isValid: false, error: "PAN number is required" };
  }

  if (upperValue.length !== 10) {
    return {
      isValid: false,
      error: "PAN number must be exactly 10 characters",
    };
  }

  if (!PAN_REGEX.test(upperValue)) {
    return {
      isValid: false,
      error:
        "Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)",
    };
  }

  return { isValid: true, formatted: upperValue };
};

// Email validation schema
export const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address")
  .max(255, "Email must be less than 255 characters");

// Password validation schema
export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password must be less than 128 characters");

// Admin notes validation - prevent XSS by limiting characters
export const adminNotesSchema = z
  .string()
  .max(2000, "Notes must be less than 2000 characters")
  .optional();

// Failure reason validation
export const failureReasonSchema = z
  .string()
  .max(1000, "Reason must be less than 1000 characters")
  .optional();

// Address validation schema - max 500 characters, basic format validation
export const addressSchema = z
  .string()
  .trim()
  .min(10, "Address must be at least 10 characters")
  .max(500, "Address must be less than 500 characters")
  .refine(
    (val) => !/[<>{}]/.test(val),
    "Address contains invalid characters"
  );

// Validate address with detailed error
export const validateAddress = (
  value: string
): { isValid: boolean; error?: string; sanitized?: string } => {
  const trimmed = value.trim();

  if (!trimmed) {
    return { isValid: false, error: "Address is required" };
  }

  if (trimmed.length < 10) {
    return { isValid: false, error: "Address must be at least 10 characters" };
  }

  if (trimmed.length > 500) {
    return { isValid: false, error: "Address must be less than 500 characters" };
  }

  if (/[<>{}]/.test(trimmed)) {
    return { isValid: false, error: "Address contains invalid characters" };
  }

  // Sanitize and return
  return { isValid: true, sanitized: sanitizeText(trimmed) };
};

// Sanitize text input to prevent XSS
export const sanitizeText = (text: string): string => {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};
