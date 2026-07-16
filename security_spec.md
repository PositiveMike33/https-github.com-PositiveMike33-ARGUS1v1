# Security Specification: ARGUS Predictive Command Center

## 1. Data Invariants
- **Subscription Invariance**: A subscription document cannot be created or modified unless the `userId` matches the authenticated user's ID. The `alertThreshold` must remain within standard operational bounds (20% to 90%).
- **Decision Invariance**: A decision log is immutable. Once created, it cannot be edited, modified, or deleted. The `userId` of the decision log must match the authenticated user's ID to prevent cross-operator eavesdropping.
- **Verification Invariance**: All write/read operations require a valid, verified email address (`email_verified == true`).

## 2. The "Dirty Dozen" Payloads
The following payloads represent malicious attempts to bypass identity, integrity, and state controls, and must return `PERMISSION_DENIED`.

1. **Identity Spoofing - Subscription Creation**: Attempting to register an alert subscription for another user's ID.
2. **Identity Spoofing - Decision Logging**: Attempting to log a ToT decision with another user's `userId`.
3. **Privilege Escalation**: Attempting to inject extra administrative roles or bypass the ownership check on a subscription.
4. **Invalid Subscription Alert Threshold**: Attempting to set an alert threshold of `150` (outside 20-90% bounds).
5. **Subscription Ghost Fields (Shadow Update)**: Injecting a ghost parameter `isVerifiedAdmin: true` during update.
6. **Immutable Decision Modification**: Attempting to update the `finalDecision` text of an archived decision.
7. **Anonymous Write**: Attempting to write a subscription without being logged in.
8. **Unverified Email Access**: Attempting to create a subscription with a Google Account that has `email_verified: false`.
9. **Decision Deletion**: Attempting to delete critical strategic decision logs.
10. **Subscription ID Poisoning**: Specifying an extremely long (1.5KB) junk string as a document ID to exhaust wallet resources.
11. **Malicious Empty Fields**: Creating a decision log missing the `feedId` or `finalDecision` string.
12. **Cross-Tenant List Scraping**: Attempting to query the list of all decisions without restricting the search to the active user's ID.

## 3. Test Runner
Below is the TypeScript test layout `firestore.rules.test.ts` representing the security controls validation.

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Test suite for securing the system's Firestore.
// Ensures that all "Dirty Dozen" invalid access attempts fail under rules enforcement.
```
