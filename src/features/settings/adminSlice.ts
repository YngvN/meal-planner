import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as adminApi from './adminApi'
import type { AppSettings, InviteCode, UserRow } from './adminApi'

interface AdminState {
  appSettings: AppSettings | null
  inviteCodes: InviteCode[]
  users: UserRow[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: AdminState = {
  appSettings: null,
  inviteCodes: [],
  users: [],
  status: 'idle',
  error: null,
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchAppSettings = createAsyncThunk('admin/fetchAppSettings', () =>
  adminApi.fetchAppSettings(),
)

export const updateAppSettings = createAsyncThunk(
  'admin/updateAppSettings',
  (patch: Partial<AppSettings>) => adminApi.updateAppSettings(patch),
)

export const fetchInviteCodes = createAsyncThunk('admin/fetchInviteCodes', () =>
  adminApi.fetchInviteCodes(),
)

export const createInviteCode = createAsyncThunk('admin/createInviteCode', () =>
  adminApi.createInviteCode(),
)

export const revokeInviteCode = createAsyncThunk('admin/revokeInviteCode', (id: string) =>
  adminApi.revokeInviteCode(id),
)

export const fetchUsers = createAsyncThunk('admin/fetchUsers', () => adminApi.fetchUsers())

export const updateUserRole = createAsyncThunk(
  'admin/updateUserRole',
  ({ userId, role }: { userId: string; role: 'admin' | 'user' }) =>
    adminApi.updateUserRole(userId, role),
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppSettings.fulfilled, (state, action) => {
        state.appSettings = action.payload
        state.status = 'succeeded'
      })
      .addCase(updateAppSettings.fulfilled, (state, action) => {
        state.appSettings = action.payload
      })
      .addCase(fetchInviteCodes.fulfilled, (state, action) => {
        state.inviteCodes = action.payload
      })
      .addCase(createInviteCode.fulfilled, (state, action) => {
        state.inviteCodes.unshift(action.payload)
      })
      .addCase(revokeInviteCode.fulfilled, (state, action) => {
        // action.meta.arg is the id that was revoked
        state.inviteCodes = state.inviteCodes.filter((c) => c.id !== action.meta.arg)
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const { userId, role } = action.meta.arg
        const user = state.users.find((u) => u.id === userId)
        if (user) user.role = role
      })
      // Generic error handling
      .addMatcher(
        (action) => action.type.startsWith('admin/') && action.type.endsWith('/rejected'),
        (state, action: { error: { message?: string } }) => {
          state.status = 'failed'
          state.error = action.error.message ?? 'An error occurred'
        },
      )
  },
})

export default adminSlice.reducer
