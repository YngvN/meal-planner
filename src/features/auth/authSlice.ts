import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as authApi from './authApi'
import type { AuthUser } from './types'

interface AuthState {
  user: AuthUser | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  /** True once the initial session-restore attempt has completed. */
  initialized: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  initialized: false,
  error: null,
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', () =>
  authApi.fetchCurrentUser(),
)

export const loginUser = createAsyncThunk(
  'auth/login',
  ({ email, password }: { email: string; password: string }) =>
    authApi.login(email, password),
)

export const signUpUser = createAsyncThunk(
  'auth/signUp',
  ({
    email,
    password,
    username,
    inviteCode,
  }: {
    email: string
    password: string
    username: string
    inviteCode?: string
  }) => authApi.signUp(email, password, username, inviteCode),
)

export const logoutUser = createAsyncThunk('auth/logout', () => authApi.logout())

export const updateUserEmail = createAsyncThunk('auth/updateEmail', (newEmail: string) =>
  authApi.updateEmail(newEmail),
)

export const updateUserPassword = createAsyncThunk(
  'auth/updatePassword',
  (newPassword: string) => authApi.updatePassword(newPassword),
)

export const updateUsername = createAsyncThunk('auth/updateUsername', (newUsername: string) =>
  authApi.updateUsername(newUsername),
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Called by AuthProvider when Supabase fires a SIGNED_OUT event. */
    loggedOut(state) {
      state.user = null
      state.status = 'idle'
      state.error = null
    },
    /** Clear any auth error (e.g. after the user edits the form). */
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Generic pending / rejected handlers that cover all async thunks.
    const setLoading = (state: AuthState) => {
      state.status = 'loading'
      state.error = null
    }
    const setError = (state: AuthState, action: { error: { message?: string } }) => {
      state.status = 'failed'
      state.error = action.error.message ?? 'An error occurred'
    }

    builder
      // fetchCurrentUser — always marks initialized=true so ProtectedApp unblocks
      .addCase(fetchCurrentUser.pending, setLoading)
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = 'succeeded'
        state.initialized = true
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null
        state.status = 'idle'
        state.initialized = true
      })

      // loginUser
      .addCase(loginUser.pending, setLoading)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = 'succeeded'
        state.error = null
      })
      .addCase(loginUser.rejected, setError)

      // signUpUser
      .addCase(signUpUser.pending, setLoading)
      .addCase(signUpUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = 'succeeded'
        state.error = null
      })
      .addCase(signUpUser.rejected, setError)

      // logoutUser
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.status = 'idle'
        state.initialized = true
        state.error = null
      })

      // updateUserEmail / updateUserPassword — don't change user object, just status
      .addCase(updateUserEmail.pending, setLoading)
      .addCase(updateUserEmail.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(updateUserEmail.rejected, setError)

      .addCase(updateUserPassword.pending, setLoading)
      .addCase(updateUserPassword.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(updateUserPassword.rejected, setError)

      // updateUsername — user object gains new username
      .addCase(updateUsername.pending, setLoading)
      .addCase(updateUsername.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = 'succeeded'
      })
      .addCase(updateUsername.rejected, setError)
  },
})

export const { loggedOut, clearError } = authSlice.actions
export default authSlice.reducer
