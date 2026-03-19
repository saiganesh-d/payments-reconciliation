export const sessionConfig = {
  maxMasterDevices: parseInt(process.env.MAX_MASTER_DEVICES || "2", 10),
  maxBAccountDevices: parseInt(process.env.MAX_B_ACCOUNT_DEVICES || "4", 10),
  sessionTimeoutHours: parseInt(process.env.SESSION_TIMEOUT_HOURS || "3", 10),
};

export function getMaxDevices(role: string): number {
  return role === "MASTER"
    ? sessionConfig.maxMasterDevices
    : sessionConfig.maxBAccountDevices;
}
