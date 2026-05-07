# Security Specification for EcoMaps

## 1. Data Invariants
- **User Profile**: A user can only create their own profile. Only admins can change roles.
- **Collection Points**: Users can create points with 'pending' status. Only moderators can set status to 'active'. Users can update their own points.
- **Reports**: Any signed-in user can create a report. Only moderators can read or update reports.
- **Recycling Routes**: Only moderators can create, update, or delete routes.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing (Point)**: Create a point with `createdBy` set to another user's UID.
2. **State Shortcut (Point)**: Create a point with `status` set to 'active' as a regular user.
3. **Privilege Escalation (User)**: Update own `role` to 'admin'.
4. **Unauthorized Update (Point)**: Update a point created by someone else.
5. **Unauthorized Read (Report)**: Read reports as a regular user.
6. **Ghost Field (Point)**: Create a point with an undocumented field `isVerified: true`.
7. **Resource Poisoning (Point)**: Create a point with a 2MB description string.
8. **ID Poisoning**: Attempt to create a point with a malicious doc ID (e.g., `../../../etc/passwd`).
9. **Orphaned Write (Report)**: Create a report for a non-existent point.
10. **Terminal State Bypass (Report)**: Update a 'resolved' report back to 'pending'.
11. **PII Leak (User)**: Read another user's profile PII (email) without being an admin.
12. **Insecure List (Point)**: Query all points including 'pending' and 'rejected' ones without being a moderator.

## 3. Test Runner (Draft)

(Tests would be implemented in a test file if a test environment was available, but here they serve as a mental checklist for rule validation.)
