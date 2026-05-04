const KEY = "stock-flow-initial-setup";
export type InitialSetupStatus = "pending" | "completed";

export function getInitialSetup(): InitialSetupStatus {
  return (localStorage.getItem(KEY) as InitialSetupStatus) || "pending";
}

export function setInitialSetup(v: InitialSetupStatus) {
  localStorage.setItem(KEY, v);
  // Allow same-tab listeners to react.
  window.dispatchEvent(new Event("stock-flow-initial-setup-changed"));
}
