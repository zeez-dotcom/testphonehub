import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as AppleStrategy } from "passport-apple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// Environment variables for OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY;

export function setupPassport() {
  // Serialize user for session storage
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Local Strategy (Email/Password)
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

          const isValidPassword = await bcrypt.compare(password, user.password || "");
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Google Strategy
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    },
      async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        // Check if user already exists with Google ID
        let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
        
        if (user) {
          // Update user with Google info if not already set
          if (!user.googleId) {
            user = await storage.updateUser(user.id, {
              googleId: profile.id,
              profileImageUrl: profile.photos?.[0]?.value,
            });
          }
          return done(null, user);
        }

        // Create new user from Google profile
        const newUser = await storage.createUser({
          email: profile.emails?.[0]?.value || '',
          password: '', // No password for OAuth users
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          googleId: profile.id,
          profileImageUrl: profile.photos?.[0]?.value,
          role: 'customer',
          isEmailVerified: true, // Google emails are pre-verified
        });

        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    }));
  }

  // Apple Strategy
  if (APPLE_CLIENT_ID && APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY) {
    passport.use(new AppleStrategy({
      clientID: APPLE_CLIENT_ID,
      teamID: APPLE_TEAM_ID,
      keyID: APPLE_KEY_ID,
      privateKey: APPLE_PRIVATE_KEY,
      callbackURL: "/api/auth/apple/callback",
      scope: ['email', 'name']
    },
      async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        const email = profile.email;
        if (!email) {
          return done(new Error('No email provided by Apple'), null);
        }

        // Check if user already exists
        let user = await storage.getUserByEmail(email);
        
        if (user) {
          // Update user with Apple info if not already set
          if (!user.appleId) {
            user = await storage.updateUser(user.id, {
              appleId: profile.id,
            });
          }
          return done(null, user);
        }

        // Create new user from Apple profile
        const newUser = await storage.createUser({
          email: email,
          password: '', // No password for OAuth users
          firstName: profile.name?.firstName || '',
          lastName: profile.name?.lastName || '',
          appleId: profile.id,
          role: 'customer',
          isEmailVerified: true, // Apple emails are pre-verified
        });

        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    }));
  }
}

// Helper function to check if OAuth providers are configured
export function getConfiguredProviders() {
  const providers = ['email']; // Email is always available
  
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    providers.push('google');
  }
  
  if (APPLE_CLIENT_ID && APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY) {
    providers.push('apple');
  }
  
  return providers;
}