import React, { useState } from "react";
import "./login.css";
import { toast } from "react-toastify";
import supabase from "../../lib/Supabase.js";
import { useForm } from "react-hook-form";
import useSessionStore from "../../lib/useStore.js";

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false); // Toggle between login and register
  const [avatar, setAvatar] = useState({ file: null, url: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Separate form handling for login and registration
  const { register: registerLogin, handleSubmit: handleSubmitLogin } =
    useForm();
  const {
    register: registerRegister,
    handleSubmit: handleSubmitRegister,
    formState: { errors },
  } = useForm();

  const handleSubmitFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar({ file: file, url: URL.createObjectURL(file) });
    }
  };

  const handleLogin = async (data) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Successfully Logged In");
    } catch (err) {
      console.error("Login error:", err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Centralized profile creation/updating function from Zustand store
  const { updateOrInsertProfile, initializeUserData } =
    useSessionStore.getState();

  const handleRegister = async (data) => {
    setIsLoading(true);
    try {
      // Step 1: Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (authError) throw authError;

      // Step 2: Insert profile using centralized store logic (handles avatar upload)
      const result = await updateOrInsertProfile({
        id: authData.user.id,
        username: data.username,
        email: data.email,
        avatarFile: avatar.file,
      });

      if (!result.success) throw result.error;
      toast.success("Registration successful!");

      // Step 3: Initialize user data in Zustand
      if (authData.user.id) {
        await initializeUserData(authData.user.id);
      }
    } catch (err) {
      console.error("Registration error:", err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="form-container">
        <h2>{isRegistering ? "Register" : "Login"}</h2>
        {isRegistering ? (
          <form onSubmit={handleSubmitRegister(handleRegister)}>
            <label htmlFor="file">
              <img src={avatar.url || "./avatar.png"} alt="Avatar" />
              Upload Your Image
            </label>
            <input
              type="file"
              id="file"
              style={{ display: "none" }}
              onChange={handleSubmitFile}
            />
            <input
              type="text"
              placeholder="User Name"
              {...registerRegister("username", { required: true })}
            />
            {errors.username && (
              <span style={{ color: "red" }}>This field is required</span>
            )}
            <input
              type="email"
              placeholder="Email"
              {...registerRegister("email", { required: true })}
            />
            {errors.email && (
              <span style={{ color: "red" }}>This field is required</span>
            )}
            <input
              type="password"
              placeholder="Password"
              {...registerRegister("password", { required: true })}
            />
            {errors.password && (
              <span style={{ color: "red" }}>This field is required</span>
            )}
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Registering..." : "Register"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitLogin(handleLogin)}>
            <input
              type="email"
              placeholder="Email"
              {...registerLogin("email", { required: true })}
            />
            <input
              type="password"
              placeholder="Password"
              {...registerLogin("password", { required: true })}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}
        <p className="toggle-text">
          {isRegistering
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <span onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Login" : "Register"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
