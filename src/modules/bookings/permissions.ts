/** Advance bookings — same floor-staff gate as sales (taking a token is a sales-floor act). */
export function canViewBookings(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

export function canCreateBooking(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

export function canCancelBooking(role: string) {
  return canCreateBooking(role);
}

export function seesAllBranches(role: string) {
  return ["creator", "owner"].includes(role);
}
