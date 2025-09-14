"use client";

import { useState } from "react";
import { RequestInfo } from "rwsdk/worker";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  finishPasskeyLogin,
  finishPasskeyRegistration,
  startPasskeyLogin,
  startPasskeyRegistration,
} from "./functions";
import { LoginForm } from "@/design-system";
import "@/design-system/tokens.css";

// TODO: Get business context from environment or route
const BUSINESS_CONTEXT = "Fresh Catch Seafood Markets";

export function Login({ ctx }: { ctx: any }) {
  const [result, setResult] = useState("");

  const handleLogin = async (username: string) => {
    try {
      // 1. Get a challenge from the worker
      const options = await startPasskeyLogin();

      // 2. Ask the browser to sign the challenge
      const login = await startAuthentication({ optionsJSON: options });

      // 3. Give the signed challenge to the worker to finish the login process
      const success = await finishPasskeyLogin(login);

      if (!success) {
        throw new Error("Login failed");
      }

      setResult("Login successful!");
      // TODO: Redirect to appropriate page based on user role
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Login failed");
      throw error; // Re-throw for LoginForm to handle
    }
  };

  const handleRegister = async (username: string, customerType?: 'individual' | 'business') => {
    try {
      // 1. Get a challenge from the worker
      const options = await startPasskeyRegistration(username);

      // 2. Ask the browser to sign the challenge
      const registration = await startRegistration({ optionsJSON: options });

      // 3. Give the signed challenge to the worker to finish the registration process
      const success = await finishPasskeyRegistration(username, registration);

      if (!success) {
        throw new Error("Registration failed");
      }

      setResult("Registration successful!");
      // TODO: Create organization for customer based on customerType
      // TODO: Link customer to business context (Evan's organization)
      // TODO: Redirect to appropriate page
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Registration failed");
      throw error; // Re-throw for LoginForm to handle
    }
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      onRegister={handleRegister}
      businessContext={BUSINESS_CONTEXT}
    />
  );
}
