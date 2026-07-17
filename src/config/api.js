export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'


/** API origin without /api/v1 — used to resolve stored document URLs for previews. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '')

export const adminApi = {
  login: `${API_BASE_URL}/admin/auth/login`,
  profile: `${API_BASE_URL}/admin/auth/me`,
  updateProfile: `${API_BASE_URL}/admin/auth/profile`,
  changePassword: `${API_BASE_URL}/admin/auth/password`,
  dashboard: `${API_BASE_URL}/admin/dashboard`,
  notifications: `${API_BASE_URL}/admin/notifications`,
  riders: `${API_BASE_URL}/admin/riders`,
  ridersPaged: `${API_BASE_URL}/admin/riders/paged`,
  onlineRiderLocations: `${API_BASE_URL}/admin/riders/online/locations`,
  ordersPaged: `${API_BASE_URL}/admin/orders/paged`,
  deleteAllOrders: `${API_BASE_URL}/admin/orders`,
  orderById: (id) => `${API_BASE_URL}/admin/orders/${encodeURIComponent(id)}`,
  orderTracking: (id) => `${API_BASE_URL}/admin/orders/${encodeURIComponent(id)}/tracking`,
  retriggerOrderDispatch: (id) =>
    `${API_BASE_URL}/admin/orders/${encodeURIComponent(id)}/retrigger-dispatch`,
  resetOrderToAccepted: (id) =>
    `${API_BASE_URL}/admin/orders/${encodeURIComponent(id)}/reset-to-accepted`,
  riderById: (id) => `${API_BASE_URL}/admin/riders/${id}`,
  resumeRiderDispatch: (id) => `${API_BASE_URL}/admin/riders/${id}/resume-dispatch`,
  vehicleMastersTree: `${API_BASE_URL}/admin/masters/tree`,
  vehicleTypes: `${API_BASE_URL}/admin/masters/vehicle-types`,
  vehicleBrands: `${API_BASE_URL}/admin/masters/vehicle-brands`,
  vehicleModels: `${API_BASE_URL}/admin/masters/vehicle-models`,
  countries: `${API_BASE_URL}/admin/masters/countries`,
  iconCatalog: `${API_BASE_URL}/admin/masters/icon-catalog`,
  apiClients: `${API_BASE_URL}/admin/api-clients`,
  apiClientById: (id) => `${API_BASE_URL}/admin/api-clients/${id}`,
  apiClientStatus: (id) => `${API_BASE_URL}/admin/api-clients/${id}/status`,
  rotateApiClientSecret: (id) => `${API_BASE_URL}/admin/api-clients/${id}/rotate-secret`,
  adminUsers: `${API_BASE_URL}/admin/users`,
  adminUserById: (id) => `${API_BASE_URL}/admin/users/${id}`,
  adminUserPassword: (id) => `${API_BASE_URL}/admin/users/${id}/password`,
  supportTickets: `${API_BASE_URL}/admin/support/tickets`,
  supportTicketById: (id) => `${API_BASE_URL}/admin/support/tickets/${id}`,
  supportTicketAttend: (id) => `${API_BASE_URL}/admin/support/tickets/${id}/attend`,
  supportTicketMessages: (id) => `${API_BASE_URL}/admin/support/tickets/${id}/messages`,
  supportTicketStatus: (id) => `${API_BASE_URL}/admin/support/tickets/${id}/status`,
  supportTicketTyping: (id) => `${API_BASE_URL}/admin/support/tickets/${id}/typing`,
  helpFaqs: `${API_BASE_URL}/admin/masters/help-faqs`,
  helpFaqById: (id) => `${API_BASE_URL}/admin/masters/help-faqs/${id}`,
  dispatchPolicies: `${API_BASE_URL}/admin/dispatch-policies`,
  platformOtpSmsSettings: `${API_BASE_URL}/admin/platform-settings/otp-sms`,
  platformOtpSmsTest: `${API_BASE_URL}/admin/platform-settings/otp-sms/test`,
  payoutsWithdrawals: `${API_BASE_URL}/admin/payouts/withdrawals`,
  payoutWithdrawal: (id) =>
    `${API_BASE_URL}/admin/payouts/withdrawals/${encodeURIComponent(id)}`,
  payoutsRemittances: `${API_BASE_URL}/admin/payouts/remittances`,
  payoutRemit: (id) =>
    `${API_BASE_URL}/admin/payouts/remittances/${encodeURIComponent(id)}/remit`,
}

export const riderAppApi = {
  requestOtp: `${API_BASE_URL}/auth/request-otp`,
  verifyOtp: `${API_BASE_URL}/auth/verify-otp`,
  home: `${API_BASE_URL}/app/home`,
  availableOrders: `${API_BASE_URL}/app/orders/available`,
  orderHistory: `${API_BASE_URL}/app/orders/history`,
  vehicleMasters: `${API_BASE_URL}/app/vehicle-masters`,
  countries: `${API_BASE_URL}/app/countries`,
  helpFaqs: `${API_BASE_URL}/app/help/faqs`,
}
