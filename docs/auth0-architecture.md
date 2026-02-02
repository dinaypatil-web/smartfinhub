# Auth0 Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SmartFinHub                              │
│                     Financial Management App                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Layer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐         ┌──────────────────────┐    │
│  │      Auth0           │         │   Supabase Auth      │    │
│  │                      │         │                      │    │
│  │  • Google OAuth      │         │  • Email/Password    │    │
│  │  • Apple Sign-In     │         │  • Phone/OTP         │    │
│  │  • Token Management  │         │  • Password Reset    │    │
│  │  • Session Handling  │         │  • Email Verification│    │
│  └──────────────────────┘         └──────────────────────┘    │
│           │                                  │                  │
│           └──────────────┬───────────────────┘                  │
│                          ▼                                      │
│              ┌────────────────────────┐                        │
│              │  HybridAuthContext     │                        │
│              │  (Unified Interface)   │                        │
│              └────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database Layer                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                      Supabase PostgreSQL                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Profiles   │  │   Accounts   │  │ Transactions │        │
│  │              │  │              │  │              │        │
│  │ • User Info  │  │ • Bank Accts │  │ • Income     │        │
│  │ • Settings   │  │ • Credit Card│  │ • Expenses   │        │
│  │ • Auth0 Sub  │  │ • Loans      │  │ • Transfers  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  Row Level Security (RLS) + Real-time Subscriptions            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### Google Sign-In Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Clicks "Sign in with Google"
     ▼
┌──────────────────┐
│  Login Page      │
│  (React)         │
└────┬─────────────┘
     │ 2. Calls loginWithGoogle()
     ▼
┌──────────────────┐
│ HybridAuthContext│
└────┬─────────────┘
     │ 3. Redirects to Auth0
     ▼
┌──────────────────┐
│  Auth0 Service   │
└────┬─────────────┘
     │ 4. Redirects to Google
     ▼
┌──────────────────┐
│  Google OAuth    │
└────┬─────────────┘
     │ 5. User authenticates
     ▼
┌──────────────────┐
│  Google OAuth    │
└────┬─────────────┘
     │ 6. Returns to Auth0
     ▼
┌──────────────────┐
│  Auth0 Service   │
└────┬─────────────┘
     │ 7. Returns to app with tokens
     ▼
┌──────────────────┐
│ HybridAuthContext│
└────┬─────────────┘
     │ 8. Syncs user to Supabase
     ▼
┌──────────────────┐
│  Supabase DB     │
│  (profiles)      │
└────┬─────────────┘
     │ 9. Profile created/updated
     ▼
┌──────────────────┐
│  Dashboard       │
│  (User logged in)│
└──────────────────┘
```

### Email/Password Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Enters email/password
     ▼
┌──────────────────┐
│  Login Page      │
└────┬─────────────┘
     │ 2. Calls loginWithEmail()
     ▼
┌──────────────────┐
│ HybridAuthContext│
└────┬─────────────┘
     │ 3. Calls Supabase Auth
     ▼
┌──────────────────┐
│  Supabase Auth   │
└────┬─────────────┘
     │ 4. Validates credentials
     ▼
┌──────────────────┐
│  Supabase DB     │
│  (auth.users)    │
└────┬─────────────┘
     │ 5. Returns session
     ▼
┌──────────────────┐
│ HybridAuthContext│
└────┬─────────────┘
     │ 6. Fetches profile
     ▼
┌──────────────────┐
│  Dashboard       │
│  (User logged in)│
└──────────────────┘
```

---

## Data Sync Process

### Auth0 User → Supabase Profile

```
┌─────────────────────────────────────────────────────────────┐
│                    Auth0 User Data                          │
├─────────────────────────────────────────────────────────────┤
│  {                                                          │
│    sub: "google-oauth2|123456789",                         │
│    email: "user@gmail.com",                                │
│    name: "John Doe",                                       │
│    picture: "https://...",                                 │
│    email_verified: true                                    │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              syncAuth0UserWithSupabase()                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Check if profile exists (by email)                     │
│     ↓                                                       │
│  2. If NOT exists:                                         │
│     • Create new profile                                   │
│     • Set email, nickname, auth0_sub                       │
│     • Set default country/currency                         │
│     ↓                                                       │
│  3. If exists:                                             │
│     • Update auth0_sub field                               │
│     • Link Auth0 account to existing profile               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Profile                           │
├─────────────────────────────────────────────────────────────┤
│  {                                                          │
│    id: "uuid-...",                                         │
│    email: "user@gmail.com",                                │
│    nickname: "John Doe",                                   │
│    auth0_sub: "google-oauth2|123456789",  ← NEW            │
│    default_country: "US",                                  │
│    default_currency: "USD",                                │
│    created_at: "2024-12-14T..."                            │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### File Structure

```
src/
├── config/
│   └── auth0.ts                    # Auth0 configuration
│
├── contexts/
│   ├── AuthContext.tsx             # Original Supabase auth (kept for reference)
│   └── HybridAuthContext.tsx       # NEW: Unified auth context
│
├── pages/
│   └── Login.tsx                   # Updated with social login buttons
│
└── App.tsx                         # Wrapped with Auth0Provider

supabase/
└── migrations/
    └── 00014_add_auth0_support.sql # Database schema update
```

### Component Hierarchy

```
App.tsx
├── Router
│   └── Auth0Provider                    ← NEW
│       └── HybridAuthProvider           ← NEW
│           ├── Toaster
│           ├── Header
│           └── Routes
│               ├── Login                ← Updated
│               ├── Dashboard
│               ├── Accounts
│               └── ...
```

---

## State Management

### Authentication State

```typescript
interface HybridAuthContextType {
  // User Information
  user: Auth0User | SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  authProvider: 'auth0' | 'supabase' | null;
  
  // Auth0 Methods
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  
  // Supabase Methods
  loginWithEmail: (email, password) => Promise<void>;
  signUpWithEmail: (email, password) => Promise<void>;
  
  // Common Methods
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // Encryption
  hasEncryptionKey: boolean;
  updateEncryptionKeyStatus: () => void;
}
```

### State Transitions

```
┌─────────────┐
│   Initial   │
│ loading=true│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Check Auth0 Authentication     │
└──────┬──────────────────────────┘
       │
       ├─── Yes ──→ ┌──────────────────┐
       │            │ Auth0 User       │
       │            │ authProvider='auth0'│
       │            └──────────────────┘
       │
       └─── No ───→ ┌──────────────────────────┐
                    │ Check Supabase Session   │
                    └──────┬───────────────────┘
                           │
                           ├─── Yes ──→ ┌──────────────────┐
                           │            │ Supabase User    │
                           │            │ authProvider='supabase'│
                           │            └──────────────────┘
                           │
                           └─── No ───→ ┌──────────────────┐
                                        │ Not Authenticated│
                                        │ user=null        │
                                        └──────────────────┘
```

---

## Security Architecture

### Token Management

```
┌─────────────────────────────────────────────────────────────┐
│                      Auth0 Tokens                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Access Token                                               │
│  ├─ Stored in: localStorage                                │
│  ├─ Expires: 1 hour                                        │
│  └─ Used for: API authentication                           │
│                                                             │
│  Refresh Token                                              │
│  ├─ Stored in: localStorage (encrypted)                    │
│  ├─ Expires: 30 days                                       │
│  └─ Used for: Getting new access tokens                    │
│                                                             │
│  ID Token                                                   │
│  ├─ Contains: User profile information                     │
│  └─ Used for: User identification                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Supabase Session                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Access Token                                               │
│  ├─ Stored in: localStorage                                │
│  ├─ Expires: 1 hour                                        │
│  └─ Used for: Database access                              │
│                                                             │
│  Refresh Token                                              │
│  ├─ Stored in: localStorage                                │
│  ├─ Expires: 30 days                                       │
│  └─ Used for: Session refresh                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                  Row Level Security (RLS)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Profiles Table                                             │
│  ├─ Users can read own profile                             │
│  ├─ Users can update own profile                           │
│  └─ Admins can read/update all profiles                    │
│                                                             │
│  Accounts Table                                             │
│  ├─ Users can only see own accounts                        │
│  ├─ Users can create/update/delete own accounts            │
│  └─ Account numbers encrypted                              │
│                                                             │
│  Transactions Table                                         │
│  ├─ Users can only see own transactions                    │
│  ├─ Users can create/update/delete own transactions        │
│  └─ Linked to user's accounts                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Error Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Occurs                             │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Catch in HybridAuthContext                     │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├─── Auth0 Error ──→ ┌──────────────────────────────┐
       │                    │ • Connection failed          │
       │                    │ • Invalid credentials        │
       │                    │ • Provider not configured    │
       │                    └──────────────────────────────┘
       │
       ├─── Supabase Error ─→ ┌──────────────────────────────┐
       │                      │ • Database error             │
       │                      │ • RLS policy violation       │
       │                      │ • Network error              │
       │                      └──────────────────────────────┘
       │
       └─── Sync Error ────→ ┌──────────────────────────────┐
                              │ • Profile creation failed    │
                              │ • Email already exists       │
                              │ • Invalid data               │
                              └──────────────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────────────────┐
                              │  Show Toast Notification     │
                              │  • User-friendly message     │
                              │  • Error details in console  │
                              └──────────────────────────────┘
```

---

## Performance Considerations

### Optimization Strategies

```
┌─────────────────────────────────────────────────────────────┐
│                   Token Caching                             │
├─────────────────────────────────────────────────────────────┤
│  • Auth0 tokens cached in localStorage                     │
│  • Automatic refresh before expiry                         │
│  • Reduces authentication requests                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Profile Caching                            │
├─────────────────────────────────────────────────────────────┤
│  • Profile fetched once on login                           │
│  • Stored in context state                                 │
│  • Manual refresh when needed                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Database Indexing                            │
├─────────────────────────────────────────────────────────────┤
│  • Index on auth0_sub for fast lookups                     │
│  • Index on email for user sync                            │
│  • Optimized query performance                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Scalability

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                            │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├─────────────┬─────────────┬─────────────┐
       ▼             ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ App      │  │ App      │  │ App      │  │ App      │
│ Instance │  │ Instance │  │ Instance │  │ Instance │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
       │             │             │             │
       └─────────────┴─────────────┴─────────────┘
                     │
                     ▼
       ┌──────────────────────────────┐
       │      Auth0 (Managed)         │
       │  • Auto-scaling              │
       │  • Global CDN                │
       │  • 99.99% uptime             │
       └──────────────────────────────┘
                     │
                     ▼
       ┌──────────────────────────────┐
       │    Supabase (Managed)        │
       │  • Auto-scaling              │
       │  • Connection pooling        │
       │  • Read replicas             │
       └──────────────────────────────┘
```

---

## Monitoring & Logging

### What to Monitor

```
┌─────────────────────────────────────────────────────────────┐
│                   Auth0 Dashboard                           │
├─────────────────────────────────────────────────────────────┤
│  • Login attempts                                           │
│  • Failed authentications                                   │
│  • Active users                                             │
│  • Token usage                                              │
│  • API rate limits                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 Supabase Dashboard                          │
├─────────────────────────────────────────────────────────────┤
│  • Database queries                                         │
│  • API requests                                             │
│  • Storage usage                                            │
│  • Active connections                                       │
│  • Error logs                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Application Logs                             │
├─────────────────────────────────────────────────────────────┤
│  • Authentication events                                    │
│  • User sync operations                                     │
│  • Error occurrences                                        │
│  • Performance metrics                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

This architecture provides:

✅ **Separation of Concerns**: Auth0 for authentication, Supabase for data  
✅ **Flexibility**: Support multiple auth methods  
✅ **Scalability**: Both services auto-scale  
✅ **Security**: Industry-standard OAuth + RLS  
✅ **Reliability**: 99.99% uptime SLA  
✅ **Maintainability**: Clear separation of responsibilities  
✅ **Extensibility**: Easy to add more auth providers  

---

*Last Updated: December 14, 2024*
