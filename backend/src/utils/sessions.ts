import type { UserDoc } from "../models/User.js";
import { disconnectUser } from "./realtime.js";

/**
 * Ends every login of this user: old tokens stop working on their next request.
 * Call BEFORE user.save(). Live connections are cut after saving (see afterRevoke).
 */
export const revokeSessions = (user: UserDoc) => {
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
}; 
  
/** Cut the user's live (Socket.io) connections — call after saving */
export const afterRevoke = (user: UserDoc) => disconnectUser(user.id);