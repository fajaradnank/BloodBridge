import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { onSnapshot, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import AdminApprovals from "./AdminApprovals";
import { formatDate } from "./adminUtils";

vi.mock("../firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "admin-1", email: "admin@gmail.com" } },
}));
vi.mock("firebase/auth", () => ({ signOut: vi.fn(() => Promise.resolve()) }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "orgs-ref"),
  doc: vi.fn(() => "doc-ref"),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "SERVER_TS"),
}));

const DAY = 86400;
const alShifa = {
  id: "1", name: "Al-Shifa Hospital", type: "hospital", status: "Pending Approval",
  registrationNo: "REG-778221", licenseNo: "LIC-4455", contactPerson: "Dr. Khan",
  accountHolder: "Dr. Imran", email: "admin@alshifa.org", phone: "+92 300 0000000",
  address: "Block 9, Karachi",
  documents: [{ name: "license.pdf", url: "https://example.com/license.pdf" }],
  createdAt: { seconds: 1700000000 },
};
const lifeline = {
  id: "2", name: "Lifeline Blood Bank", type: "blood bank", status: "pending",
  createdAt: { seconds: 1700000000 + 2 * DAY },
};
const unity = { id: "3", name: "Unity Hospital", type: "hospital", status: "Approved", createdAt: { seconds: 1700000000 } };
const rejectedClinic = {
  id: "4", name: "Rejected Clinic", type: "hospital", status: "rejected",
  rejectionReason: "Invalid license", createdAt: { seconds: 1700000000 },
};
// Deliberately NOT in date order, to prove the page sorts oldest first
const ALL = [lifeline, alShifa, unity, rejectedClinic];

let emit;
const snapshotOf = (list) => ({
  docs: list.map(({ id, ...rest }) => ({ id, data: () => rest })),
});
function loadOrgs(list) {
  onSnapshot.mockImplementation((ref, next) => {
    emit = (l) => next(snapshotOf(l));
    next(snapshotOf(list));
    return () => {};
  });
}

const openReview = (name) => fireEvent.click(screen.getByRole("button", { name: `Review ${name}` }));

beforeEach(() => {
  vi.clearAllMocks();
  loadOrgs(ALL);
});

describe("FR2.2 A01 approvals queue", () => {
  it("AC2: lists only organizations that are pending", async () => {
    render(<AdminApprovals />);
    expect(await screen.findByText("Al-Shifa Hospital")).toBeInTheDocument();
    expect(screen.getByText("Lifeline Blood Bank")).toBeInTheDocument();
    expect(screen.queryByText("Unity Hospital")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejected Clinic")).not.toBeInTheDocument();
  });

  it("AC3: each entry shows name, type and date submitted", async () => {
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    expect(screen.getByText("Hospital")).toBeInTheDocument();
    expect(screen.getByText("Blood bank")).toBeInTheDocument();
    expect(screen.getByText(formatDate(alShifa.createdAt))).toBeInTheDocument();
    expect(screen.getByText(formatDate(lifeline.createdAt))).toBeInTheDocument();
  });

  it("A01: oldest submission is listed first", async () => {
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Al-Shifa Hospital")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Lifeline Blood Bank")).toBeInTheDocument();
  });

  it("A01: sidebar Approvals item shows the pending count badge", async () => {
    render(<AdminApprovals />);
    expect(await screen.findByRole("link", { name: "Approvals 2" })).toBeInTheDocument();
  });

  it("A01: search filters by organization name", async () => {
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    fireEvent.change(screen.getByLabelText(/search by name/i), { target: { value: "lifeline" } });
    expect(screen.getByText("Lifeline Blood Bank")).toBeInTheDocument();
    expect(screen.queryByText("Al-Shifa Hospital")).not.toBeInTheDocument();
  });

  it("A01: Approved and Rejected tabs show the right organizations", async () => {
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    fireEvent.click(screen.getByRole("tab", { name: /^approved/i }));
    expect(screen.getByText("Unity Hospital")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /^rejected/i }));
    expect(screen.getByText("Rejected Clinic")).toBeInTheDocument();
  });

  it("A01: empty state when nothing is pending", async () => {
    loadOrgs([unity]);
    render(<AdminApprovals />);
    expect(await screen.findByText("No organization waiting for approval")).toBeInTheDocument();
  });

  it("shows a loading message first", () => {
    onSnapshot.mockImplementation(() => () => {});
    render(<AdminApprovals />);
    expect(screen.getByText(/loading organizations/i)).toBeInTheDocument();
  });

  it("shows an error banner with Try again when loading fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    onSnapshot.mockImplementation((ref, next, onError) => {
      onError(new Error("permission-denied"));
      return () => {};
    });
    render(<AdminApprovals />);
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load organizations.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("FR2.2 A02 review screen", () => {
  it("AC4: opening an entry shows the full submitted credentials", async () => {
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    openReview("Al-Shifa Hospital");
    expect(screen.getByRole("heading", { level: 1, name: /Al-Shifa Hospital/ })).toBeInTheDocument();
    for (const value of [
      "REG-778221", "LIC-4455", "Dr. Khan", "Dr. Imran", "admin@alshifa.org",
      "+92 300 0000000", "Block 9, Karachi",
    ]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "license.pdf" })).toHaveAttribute("href", "https://example.com/license.pdf");
  });

  it("Back to queue returns to the list", async () => {
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    openReview("Al-Shifa Hospital");
    fireEvent.click(screen.getByRole("button", { name: /back to queue/i }));
    expect(screen.getByRole("heading", { name: "Approvals" })).toBeInTheDocument();
  });

  it("AC5: Approve and Reject are available, Reject locked until a reason is typed", async () => {
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    openReview("Al-Shifa Hospital");
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
    const reject = screen.getByRole("button", { name: "Reject" });
    expect(reject).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "Invalid license" } });
    expect(reject).toBeEnabled();
  });

  it("AC5: Approve saves status Approved and returns to the queue", async () => {
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    openReview("Al-Shifa Hospital");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(updateDoc).toHaveBeenCalledWith("doc-ref", expect.objectContaining({ status: "Approved" }))
    );
    expect(await screen.findByRole("heading", { name: "Approvals" })).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("Al-Shifa Hospital was approved.");
  });

  it("AC5: Reject saves status Rejected with the reason after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    openReview("Al-Shifa Hospital");
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "Invalid license" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() =>
      expect(updateDoc).toHaveBeenCalledWith(
        "doc-ref",
        expect.objectContaining({ status: "Rejected", rejectionReason: "Invalid license" })
      )
    );
  });

  it("Reject does nothing when the admin cancels the confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    openReview("Al-Shifa Hospital");
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "Invalid license" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("shows the saved reason for an already rejected organization", async () => {
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    fireEvent.click(screen.getByRole("tab", { name: /^rejected/i }));
    openReview("Rejected Clinic");
    expect(screen.getByText(/Invalid license/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });
});

describe("FR2.2 AC7 live queue", () => {
  it("removes an organization from Pending when it gets approved elsewhere", async () => {
    render(<AdminApprovals />);
    await screen.findByText("Al-Shifa Hospital");
    act(() => emit([lifeline, { ...alShifa, status: "Approved" }, unity, rejectedClinic]));
    expect(screen.queryByText("Al-Shifa Hospital")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Approvals 1" })).toBeInTheDocument();
  });

  it.todo("AC1: seeded Platform Admin cannot be created via public registration (manual check, see Trello comment)");
});

describe("Admin shell (wireframes A01/A02 layout)", () => {
    it("uses the app's logout handler when one is provided", async () => {
    const onLogout = vi.fn();
    render(<AdminApprovals onLogout={onLogout} />);
    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));
    await waitFor(() => expect(onLogout).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });

  it("shows the BloodBridge Admin title, bell and profile icons", async () => {
    render(<AdminApprovals />);
    expect(await screen.findByText("BloodBridge Admin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Profile menu" }));
    expect(screen.getByText("admin@gmail.com")).toBeInTheDocument();
  });

  it("hamburger button opens the sidebar drawer", async () => {
    render(<AdminApprovals />);
    const nav = await screen.findByRole("navigation", { name: /admin navigation/i });
    expect(nav).not.toHaveClass("open");
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(nav).toHaveClass("open");
  });

  it("Log out signs the admin out", async () => {
    render(<AdminApprovals />);
    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });
});